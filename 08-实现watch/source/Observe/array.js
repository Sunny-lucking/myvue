// 获取数组原型上的方法
import {observe} from "../../../02-重写数组方法/source/Observe";

let oldArrayPrototypeMethods = Array.prototype
// 复制一份 然后改成新的
export let arrayMethods = Object.create(oldArrayPrototypeMethods)

// 修改的方法
let methods = ['push','shift','unshift','pop','reverse','sort','splice']

export function observerArray(inserted){
    // 循环监听每一个新增的属性
    for(let i =0;i<inserted.length;i++){
        observe(inserted[i])
    }
}
// 递归收集依赖
export function dependArray(value){
    for(let i = 0; i <value.length; i++){
        let currentItem = value[i]
        currentItem.__ob__ && currentItem.__ob__.dep.depend()
        if (Array.isArray(currentItem)) {
            dependArray(currentItem)
        }
    }
}

methods.forEach(method=>{
    arrayMethods[method] = function (...arg) {
        // 不光要返回新的数组方法，还要执行监听
        let res = oldArrayPrototypeMethods[method].apply(this,arg)
        // 实现新增属性的监听
        console.log("我是{}对象中的push,我在这里实现监听");
        // 实现新增属性的监听
        let inserted
        switch (method) {
            case 'push':
            case 'unshift':
                inserted = arg
                break
            case 'splice':
                inserted = arg.slice(2)
                break
            default:
                break
        }
        // 实现新增属性的监听
        if (inserted){
            observerArray(inserted)
        }
        this.__ob__.dep.notify()
        return res
    }
})

