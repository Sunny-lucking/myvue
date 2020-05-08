let id = 0
class Dep {
    constructor(){
        this.id = id++
        this.subs = []
    }
    addSub(watcher){ //订阅
        this.subs.push(watcher)
    }
    notify(){ //发布
        this.subs.forEach(watcher =>{
            watcher.update()
        })
    }
    depend(){
        if (Dep.target){
            Dep.target.addDep(this)
        }
    }
}
// 保存当前watcher
let stack = []
export function pushTarget(watcher) {
    console.log("我在渲染组件");
    Dep.target = watcher
    stack.push(watcher)
}
export function popTarget() {
    stack.pop()
    Dep.target = stack[stack.length - 1]
}

export default Dep
