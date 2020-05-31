import {pushTarget , popTarget} from "./dep"
let id = 0
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts){
        this.vm = vm
        this.exprOrFn = exprOrFn
        this.cb = cb
        this.id = id++
        this.deps = []
        this.depsId = new Set()
        if (typeof exprOrFn === 'function'){
            this.getter = exprOrFn
        }
        this.get()  // 创建一个watcher，默认调用此方法
    }
    get(){
        pushTarget(this)
        this.getter()
        popTarget()
    }
    update(){
        // this.get()
        queueWacther(this)
    }
    run(){
        this.get()
    }
    addDep(dep){
        let id = dep.id
        if(this.depsId.has(id)){
            this.depsId.add(id)
            this.deps.push(dep)
        }
        dep.addSub(this)
    }
}
let has = {}
let queue = []
function flushQueue() {
    console.log("执行了flushQueue");
    queue.forEach(watcher=>{
        watcher.run()
    })
    has = []
    queue = []
}
function queueWacther(watcher) {
    let id = watcher.id
    if(has[id] == null){
        has[id] = true
        queue.push(watcher)
    }
    nextTick(flushQueue)
}
let callbacks = []
function flushCallbacks() {
    console.log("我来执行callbacks");
    console.log(callbacks);
    callbacks.forEach(cb=>cb())
    callbacks = []
}

function nextTick(flushQueue) {
    callbacks.push(flushQueue)
    // let asyncFun = ()=>{
    //
    // }
    Promise.resolve().then(flushCallbacks)
}

export default Watcher
