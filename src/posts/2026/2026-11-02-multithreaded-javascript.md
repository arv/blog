---json
{
  "title": "Multithreaded JavaScript",
  "date": "2026-11-02T18:35:20+01:00",
  "tags": [
    "JavaScript",
    "TypeScript",
    "WebAssembly",
    "Open Source"
  ]
  }
---

Over the last few weeks I haven't been able to stop thinking about
multithreaded JavaScript.

It all started with me seeing Jarred Sumner's
[PR](https://github.com/oven-sh/WebKit/pull/249) adding shared-memory threads to
JavaScriptCore in Bun's fork of WebKit. It pointed to Filip Pizlo's WebKit blog
post "[Concurrent JavaScript: It can
work!](https://webkit.org/blog/7846/concurrent-javascript-it-can-work/)".

The idea behind both is to allow multiple threads that share the same memory.
The threads share the same realm (global) and module graph. This is different
from `Worker`s where each worker has its own heap (memory), global and module
graph. With a shared heap, reading and writing the same JavaScript object from
different threads becomes possible.

```js
const o = {value: 1};
const t = new Thread(() => {
  console.log(o.value); // 1
  o.value = 2;
});
console.log(o.value); // 1 or 2
await t.asyncJoin();
console.log(o.value); // 2
```

What Pizlo's blog post outlines is how to make this cheap. Reads never lock, no
matter which thread does them. Every object remembers the thread that created
it, and that thread gets to write to it after a single compare of a lock word.
Only when another thread wants to write does the object get handed over and
become locked. Races are allowed. A racing read may see any interleaving, but
it never crashes, never sees a torn or made-up value, and a write to an
unrelated property is never lost.

So I built it. Three times, in fact, each time giving up a bit of the model to
get something that runs today.

## Phase 1: Porffor

[Porffor](https://porffor.dev/) is an ahead-of-time compiler from JS to C,
which is then compiled to WebAssembly (Wasm) or native code (it used to emit
Wasm directly). It is very small compared to V8 and JSC and it is something
that is pretty easy to hack on (relatively speaking).

I hacked Porffor to support multiple threads using the model proposed by Pizlo.
The code is on the
[`arv/shared-everything-threads`](https://github.com/arv/porffor/tree/arv/shared-everything-threads)
branch and the
[README](https://github.com/arv/porffor/blob/arv/shared-everything-threads/threads/README.md)
goes into the details. Most of it was done iterating with Claude Code. The API
is small:

```js
const results = [];
const lock = new Lock();
const stats = { done: 0 };
const threads = [];
for (let id = 0; id < 4; id++) threads.push(new Thread(() => {
  results.push(id);                   // a shared array: every push lands
  lock.hold(() => { stats.done++; }); // read-modify-write under a lock
  return id * 2;
}));
console.log(threads.map(t => t.join())); // [0, 2, 4, 6]
```

`Thread` has `join()` and `asyncJoin()`, `Lock` is a mutex, `Condition` is a
condition variable, and `SharedArrayBuffer` and `Atomics` work across threads.
It worked!

Porffor has its own object representation and its own GC, so all threads can
simply share one heap. In the browser that is Wasm shared memory and in native
builds it is plain process memory. The GC had to learn about threads. It stops
the world, and each thread parks at a safepoint, either in the allocator or at
a loop back-edge. Its stack is then scanned conservatively, just like the main
thread's. Single-threaded code pays little for all this: in a program that uses
threads it runs 0 to 7% slower than the same program built without them, and
the v8-v7 benchmark suite about 1% slower.

Here is an in-browser
[playground](https://porffor-threads.up.railway.app/threads/playground/). It
uses a Wasm version of Porffor itself to compile your code to Wasm and then run
it in your browser. The mandelbrot demo gets a roughly 7x speedup from 8
threads (if you have 8 or more performance cores).

## Phase 2: `@arv/threads`

Even though the Porffor experiment worked I wasn't satisfied. I wanted
something that can be used in today's browsers with the current speed of JS.
Porffor is just a lot slower than V8/JSC/SpiderMonkey.

My first experiment was to transpile objects touched by multiple threads to
live in a `SharedArrayBuffer`. It used TypeScript to figure out when an object
was known statically to be shared and rewrote those. The problem is that you
cannot know statically all the objects that will be shared, so the unknown ones
need to be rewritten just in case. I didn't take that route because it turned
out that the rewritten objects were just too slow for the general case.

After talking to [Justin Fagnani](https://bsky.app/profile/justinfagnani.com)
about [Zena](https://zena-lang.dev/) and its plans for threads, I was inspired
to try type annotations and an ownership checker as a fast, efficient and
opinionated way to write multithreaded JS. The result is
[`@arv/threads`](https://npmx.dev/package/@arv/threads), developed in
[arv/threads](https://github.com/arv/threads).

Every value is one of three things. An owned value (`Sending<T>` in the types)
belongs to one thread and moves when you send it to another, so the sender
can't use it again. A shared value (`Shared<T>`) is frozen, deeply, and any
thread can read it. A cell is built for sharing: structs (inspired by the
[TC39 proposal for structs](https://tc39.es/proposal-structs/)),
`SharedArray`, `SharedMap`, `Lock` and `Channel` are the only things that live
in shared memory, and threads read and write them in place. A checker then
reports what TypeScript's types can't see: a value used after it was sent, an
alias of something sent, a write to a shared value through a cast, or a
blocking call in an async function.

The checker started as a fork of TypeScript that added lifetimes to `Sending`
values. It no longer needs the fork: the checker and the compiler now run on
stock TypeScript 7.1's API, and the fork is retired.

Here is N-body, with the bodies in a struct array that every thread works on
in place:

```ts
import {f64, scope, SharedArray, struct, type Struct} from '@arv/threads';

const Body = struct({x: f64, y: f64, vx: f64, vy: f64, m: f64}); // Lives in shared memory.
type Body = Struct<typeof Body>;

function step(bodies: SharedArray<Body>, lo: number, hi: number) {
  for (let i = lo; i < hi; i++) bodies[i].x += bodies[i].vx; // Every thread sees the same memory.
}

export function main(threads: number) {
  const bodies = new SharedArray(Body, 800);
  scope(s => {
    for (let t = 0; t < threads; t++)
      s.spawn(
        step,
        bodies,
        Math.floor((t * 800) / threads),
        Math.floor(((t + 1) * 800) / threads),
      );
  }); // Joins every thread it started.
}
```

The compiler is what makes the structs fast. It lays shared structs out in
shared memory and turns a field read like `b.x` into a typed-array read,
`__F64[(b >> 3) + 1]`. With the types only erased the program still runs, but
much slower. The N-body program above, with 800 bodies, takes 29, 15, 8 and 6
ms on 1, 2, 4 and 8 threads when compiled, against 25 ms for the same program
on ordinary objects, single-threaded, and 1820 ms on one thread with the types
only erased.

Struct fields aren't only `f64`. There are `i32`, `u8`, `bool`, `str` and
`ref<T>()` fields too, kept the way an `Int32Array` keeps them. The checker
requires that what you store into an `i32` or `u8` is an integer, so a number
that may have a fraction needs `x | 0`, `Math.round(x)` or integer arithmetic
first.

It is experimental and has real limits: shared memory is a fixed 256 MB and not
everything in it is freed yet, closures don't cross threads, and a `SharedMap`
has a single lock.

Here is an in-browser
[playground](https://threads.arv.tools/playground/) for this one too. It runs
the checker and the compiler on stock TypeScript, compiled to Wasm, and shows
the compiled JavaScript next to your code.

## Phase 3: `@arv/structs`

The structs and `SharedArray` in Phase 2 were already modelled on the TC39
structs proposal. I thought, why not just scale back Phase 2 to be as close as
possible to the spec instead? So that is what I did. The result is
[`@arv/structs`](https://structs.arv.tools/), developed in
[arv/structs](https://github.com/arv/structs): a runtime that follows the spec's
algorithms and a compiler for the proposal's syntax, covering structs, shared
structs, `SharedArray`, `Atomics.Mutex` and `Atomics.Condition`. The compiler is
needed because `shared struct` is not valid JavaScript yet.

The struct proposal is all about fixed-layout, sealed objects. A plain struct
lives in the normal heap and a shared struct in a heap that is shared between
workers, pretty much the same way a `SharedArrayBuffer` is shared. For a plain
struct the program can't actually tell where it lives.

Here is the repo's counter example, in plain JavaScript plus the proposal's
syntax. Four workers count to a million together:

```js
// main.js
import {startWorker} from '@arv/structs/agent';

shared struct Tally {
  count = 0;
  mutex = new Atomics.Mutex();
}

const tally = new Tally(); // Lives in shared memory.
const done = [];
for (let i = 0; i < 4; i++) {
  const w = startWorker(new URL('./worker.js', import.meta.url));
  w.postMessage({tally, n: 250_000}); // The same object in the worker, not a copy.
  done.push(new Promise(resolve => w.onmessage = resolve));
}
await Promise.all(done);
console.log(tally.count); // 1000000

// worker.js
import {parent} from '@arv/structs/agent';

parent.onmessage = ({tally, n}) => {
  for (let i = 0; i < n; i++) {
    using _ = Atomics.Mutex.lock(tally.mutex);
    tally.count++;
  }
  parent.postMessage('done');
};
```

The workers are started through the library's agent module, so they attach to
the same heap, and a `postMessage` through it hands over the shared struct as
the same object, not a copy. The proposal itself leaves sharing across agents
to the host. The `using` declaration unlocks the mutex at the end of each
iteration. Each worker posts back when it is done, so the main thread awaits
promises instead of blocking on an `Atomics.Condition`, which a browser's main
thread isn't allowed to do.

Under the hood it is the Phase 2 trick again: the shared heap is one
`SharedArrayBuffer` that every worker attaches to, each shared struct is a
Proxy over its block (one Proxy per block per worker, so `===` holds), and in
TypeScript a field declared `: number` gets direct typed-array access. It is
also my very first Phase 2 experiment made opt-in. Only what you declare
`shared struct` is rewritten to live in the buffer, so the general case never
pays for it.

This one has a [playground](https://structs.arv.tools/playground/) as well. It
compiles the struct syntax as you type, shows the compiled JavaScript, and runs
your program on workers.

## Conclusion

Phases 2 and 3 both make you decide up front what is shared and give it a
special type. Phase 1 lets any object be shared. I still think that the
shared-everything model from Phase 1 is the clear winner. Threads that live in
the same realm and can reach any object are simply the easier model to work
with.

It needs an engine to ship it, though, and Bun's PR is the one to watch. Until
then Phases 2 and 3 are what we can use today.

Does the simple model still matter now that we rarely write the code
ourselves? An LLM can set up the goop needed to send a `SharedArrayBuffer` to
a worker and encode objects into byte arrays. But the encoding and decoding is
still there, and it is still a cost. We have all seen a good architecture fall
over on serialization.

If you try any of the three playgrounds, I'd love to hear what you build and
what breaks.

[Comments on Bluesky](https://bsky.app/profile/arv.tools/post/3mzjac6u54k2r).
