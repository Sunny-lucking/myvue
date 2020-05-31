import {pushTarget , popTarget} from "./dep"
import {util} from "./utils";

let id = 0
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts = {}){
        this.vm = vm
        this.exprOrFn = exprOrFn
        this.cb = cb
        this.id = id++
        this.deps = []
        this.depsId = new Set()
        this.lazy = opts.lazy
        this.dirty = this.lazy
        if (typeof exprOrFn === 'function'){
            this.getter = exprOrFn
        }else{
            // 现在exprOrFn是我们传进来的key
            this.getter = function () {
                return util.getValue(vm,exprOrFn)
            }
        }
        this.value = this.lazy? undefined : this.get() //获得老值oldValue
        // 创建一个watcher，默认调用此方法
    }
    get(){
        pushTarget(this)
        let value = this.getter.call(this.vm)
        popTarget()
        return value
    }
    update(){
        // this.get()
        // 批量更新， 防止重复渲染
        if (this.lazy){ // 如果是计算属性
            this.dirty = true
        }else{
            queueWacther(this)
        }
    }
    run(){
        let value = this.get()
        if (this.value !== value){
            this.cb(value,this.value)
        }
    }
    addDep(dep){
        let id = dep.id
        if(this.depsId.has(id)){
            this.depsId.add(id)
            this.deps.push(dep)
        }
        dep.addSub(this)
    }
    evalValue(){
        this.value = this.get()
        this.dirty = false
    }
    depend(){
        let i = this.deps.length
        while(i--){
            this.deps[i].depend()
        }
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
