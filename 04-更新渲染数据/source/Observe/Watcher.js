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
export default Watcher
