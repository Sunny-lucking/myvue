const defaultRGE = /\{\{((?:.|\r?\n)+?)\}\}/g

export const util = {
    getValue(vm,exp){
        let keys = exp.split('.')
        return keys.reduce((memo,current)=>{
            memo = memo[current]
            return memo
        },vm)
    },
    compilerText(node,vm){
        if(!node.expr){
            node.expr = node.textContent
        }
        node.textContent = node.expr.replace(defaultRGE,function (...arg) {
            console.log(arg);
            return util.getValue(vm,arg[1])
        })
    }
}

export function compiler(node,vm) {
    // 1 取出子节点、
    let childNodes = node.childNodes
    childNodes = Array.from(childNodes)
    childNodes.forEach(child =>{
        if (child.nodeType === 1 ){
            compiler(child,vm)
        }else if (child.nodeType ===3) {
            util.compilerText(child,vm)
        }
    })
}
