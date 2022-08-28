1.准备工作
============

** 我们先利用webpack构建项目:**

*   初始化项目
    
    `npm init -y`
    
*   安装webpack
    
    `npm i webpack webpack-cli webpack-dev-server html-webpack-plugin --save`
    
*   配置webpack
    

```js
    // webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
    entry:'./src/index.js',// 以src下的index.js 作为入口文件进行打包
    output:{
        filename:'bundle.js',
        path:path.resolve(__dirname,'dist')
    },
    devtool:'source-map', // 调试的时候可以快速找到错误代码
    resolve:{
        // 更改模块查找方方式（默认的是去node_modules里去找）去source文件里去找
        modules:[path.resolve(__dirname,'source'),path.resolve('node_modules')]
    },
    plugins:[
        new HtmlWebpackPlugin({
            template:path.resolve(__dirname,'public/index.html')
        })
    ]
}
```


    
*   配置package.json
    

```js
    "scripts": {
    "start": "webpack-dev-server",
    "build": "webpack"
  },
```

    
2 实现数据监听
==========
#### 2.1 创建构造函数MyVue
```js
function MyVue(options) {
    this._init(options)
}

MyVue.prototype._init = function (options) {
    let vm = this;
    // this.$options表示是Vue中的参数,如若我们细心的话我们发现vue框架的可读属性都是$开头的
    vm.$optios = options;

    // MVVM原理 重新初始化数据  data
    initState(vm)
}
```

并初始化用户传入的参数`options`，我们先假设用户传入的`options`是只有`data`属性和`el`属性的。


```js
export function initState(vm) {
    let opt = vm.$optios
    if (opt.data){
        initData(vm);
    }
}

function initData(vm) {
    // 获取用户传入的data
    let data = vm.$optios.data
    // 判断是不是函数，我们知道vue，使用data的时候可以data：{}这种形式，也可以data(){return{}}这种形式
    // 然后把把用户传入的打他数据赋值给vm._data
    data = vm._data = typeof data === 'function' ? data.call(vm) : data ||{}

    observe(data)
}

```




到这里我们实现的是new MyVue的时候，通过_init方法来初始化options， 然后通过initData方法将data挂到vm实例的_data上去了，接下来，我们要对data实现数据监听，上面的代码中observe代码就是用来实现数据监听的。


#### 2.2 实现数据监听

```js
export function observe(data) {
    if (typeof data !== 'object' || data == null){
        return
    }
    return new Observe(data)
}

```
在这段代码observe方法的代码中，observe()将传入的data先进行判断，如果data是对象，则new 一个Observe对象来使这个data 实现数据监听，我们再看下Observe是怎么实现的

```js
class Observe {
    constructor(data){ // data就是我们定义的data vm._data实例
        // 将用户的数据使用defineProperty定义
        this.walk(data)
    }
    walk(data){
        let keys = Object.keys(data)
        for (let i = 0;i<keys.length;i++){
            let key  = keys[i]; // 所有的key
            let value = data[keys[i]] //所有的value
            defineReactive(data,key,value)
        }
    }
}

```
可见，Observe 将data传入walk方法里，而在walk方法里对data进行遍历，然后将data的每一个属性和对应的值传入`defineReactive`，我们不难猜测，这个`defineReactive`就是将data的每一个属性实现监听。我们再看下`defineReactive`。


```js
export function defineReactive(data,key,value) {
  
    Object.defineProperty(data,key,{
        get(){
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
            observe(value)
        }
    })
}

```
可见，这是通过defineProperty，=将每个key进行数据监听了。但是这里有一个问题，就是，这里只能监听一个层级，比如

```js
data = {
  wife:"迪丽热巴"
}
```
这时没问题的，但是
```js
data = {
  wife:{
    name："迪丽热码",
    friend:{
      name:"古力娜和"
    }
  }
}
```
我们只能监听到wife.friend和wife.name是否改变与获取，无法监听到wife.friend.name这个属性的变化，因此，我们需要判断wife.friend是不是对象,然后将这个friend对象进行遍历对它的属性实现监听
#### 2.3 解决多层级监听的问题
因此我们在上面代码的基础上，添加上`observe（value）`就实现了递归监听

```js
export function defineReactive(data,key,value) {
    // 观察value是不是对象，是的话需要监听它的属性。
    observe(value)

    Object.defineProperty(data,key,{
        get(){
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
        }
    })
}

```
基本完成。

但是到这里，还有一个问题，就是我们上面的data都是new MyVue的时候传进去的，因此要是我们再new 完 改变data的某个值，如下面将message改成迪丽热巴对象，此时虽然我们依旧可以监听message，但是message.name是监听不到的


```js
let vm = new MyVue({
    el: '#app',
    data(){
        return{
            message:'大家好',
            wife:{
                name:"angelababy",
                age:28
            }
        }
    }
})
vm._data.message = {
    name:'迪丽热巴',
    age:30
}
```

#### 2.4 解决data中某个属性变化后无法监听的问题
我们知道 message这个属性已经被我们监听了，所以改变message的时候，会触发set（）方法，因此我们只需要将wife再放进observe()中重新实现监听一遍即可，如代码所示


```js
export function defineReactive(data,key,value) {
    // 观察value是不是对象，是的话需要监听它的属性。
    observe(value)

    Object.defineProperty(data,key,{
        get(){
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
            observe(value)
        }
    })
}
```

#### 2.5 实现数据代理


我们用过vue的都知道，我们获取data中的属性的时候，都是直接通过this.xxx,获取值的，而我们上面只实现了想要获取值需要通过this._data.xxx,所以这一节来实现是数据代理，即将data中的属性挂载到vm上，我们可以实现一个proxy方法，该方法将传入的数据挂载到vm上，而当我们访问this.xxx的时候，其实是访问了this._data.xxx，这就是代理模式。
增加proxy后代码如下

```js
function proxy(vm,source,key) {
    Object.defineProperty(vm,key,{
        get(){
            return vm[source][key]
        },
        set(newValue){
            return vm[source][key] = newValue
        }
    })
}
function initData(vm) {
    // 获取用户传入的data
    let data = vm.$optios.data
    // 判断是不是函数，我们知道vue，使用data的时候可以data：{}这种形式，也可以data(){return{}}这种形式
    // 然后把把用户传入的打他数据赋值给vm._data
    data = vm._data = typeof data === 'function' ? data.call(vm) : data ||{}

    for (let key in data) {
        proxy(vm,"_data",key)
    }

    observe(data)
}

```

实现原理非常简单，实际上就是但我们想要获取`this.wife`时，其实是去获取`this._data.wife`


至此，我们已经实现了数据监听，但是还有个问题，即Object.defineProperty的问题，也是面试常见的问题，即Object.defineProperty是无法监听数组的变化的

## 3 重写数组方法

如图所示，我们企图往数组arr中添加值，结果发现新添加进去的值是没办法被监听到的，因此，我们需要改写push等方法

```js
let vm = new MyVue({
    el: '#app',
    data(){
        return{
            message:'大家好',
            wife:{
                name:"angelababy",
                age:28
            },
            arr:[1,2,{name:"赵丽颖"}]
        }
    }
})
vm.arr.push({hah:'dasd'})
```


基本思路就是之前我们调用push方法时，是从Aarray.prototype寻找这个方法，我们改成用一个空对象{} 继承 Aarray.prototype，然后再给空对象添加push方法
```
{
    push：function(){}
}
```
这样，我们调用push的时候，实际上就是调用上面{}中的push

现在，我们先区分出用户传入的Observe中接受监听的data是数组还是对象，如果是数组，则改变数组的原型链，这样才能改变调用push时，是调用我们自己设置的push，
只需要在Observe添加判断是数组还是对象即可。
```js
class Observe {
    constructor(data){ // data就是我们定义的data vm._data实例
        // 将用户的数据使用defineProperty定义
        if (Array.isArray(data)){
            data.__proto__ = arrayMethods
        }else {
            this.walk(data)
        }
    }
    walk(data){
        let keys = Object.keys(data)
        for (let i = 0;i<keys.length;i++){
            let key  = keys[i]; // 所有的key
            let value = data[keys[i]] //所有的value
            defineReactive(data,key,value)
        }
    }
}
```


其中的`arrayMethods`则是我们一直说的那个对象{},它里面添加push等方法属性

```js
let oldArrayPrototypeMethods = Array.prototype
// 复制一份 然后改成新的
export let arrayMethods = Object.create(oldArrayPrototypeMethods)

// 修改的方法
let methods = ['push','shift','unshift','pop','reverse','sort','splice']

methods.forEach(method=>{
    arrayMethods[method] = function (...arg) {
        // 不光要返回新的数组方法，还要执行监听
        let res = oldArrayPrototypeMethods[method].apply(this,arg)
        // 实现新增属性的监听
        console.log("我是{}对象中的push,我在这里实现监听");
      
      
        return res
    }
})
```
实际上这是一种拦截的方法。
接下来，我们就要着手实现新增属性的监听。基本思路，1.获得新增属性，2.实现监听

```js
methods.forEach(method=>{
    arrayMethods[method] = function (...arg) {
        // 不光要返回新的数组方法，还要执行监听
        let res = oldArrayPrototypeMethods[method].apply(this,arg)
        // 实现新增属性的监听
        console.log("我是{}对象中的push,我在这里实现监听");
        // 实现新增属性的监听
        let inserted  // 1.获得新增属性
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
        return res
    }

})
```
这里用到了`observerArray`，我们看一下

```js
export function observerArray(inserted){
    // 循环监听每一个新增的属性
    for(let i =0;i<inserted.length;i++){
        observe(inserted[i])
    }
}
```

可见，它是将inserted进行遍历，对每一项实现监听。可能这里你会有疑问，为什么要进行遍历，原因是inserted不一定是一个值，也可能是多个，例如[].push(1,2,3)。

现在已经实现了数组方法的拦截，还有个问题没有解决，就是当我们初始化的时候，data里面可能有数组，因此也要把这个数组进行监听


```js
constructor(data){ // data就是我们定义的data vm._data实例
    // 将用户的数据使用defineProperty定义
    if (Array.isArray(data)){
        data.__proto__ = arrayMethods
        observerArray(data)
    }else {
        this.walk(data)
    }
}
```

现在已经实现了对数据的监听，不过这里还有问题没解决，也是vue2.0中没有解决的问题，就是这里并没有实现对数组的每一项实现了监听
例如，这样是不会监听到的。

```js
let vm = new MyVue({
    el: '#app',
    data(){
        return{
            message:'大家好',
            wife:{
                name:"angelababy",
                age:28
            },
            arr:[1,2,{name:"赵丽颖"}]
        }
    }
})
vm.arr[0] = "我改了"
```

不仅如此，`vm.arr.length = 0`,当你这样设置数组长度时，也是无法监听到的。

## 4.初始化渲染页面

数据初始化之后，接下来，就要把初始化好的数据渲染到页面上去了也就是说当dom中有{{name}}这样的引用时，要把{{name}}替换成data里对应的数据

```js
MyVue.prototype._init = function (options) {
    let vm = this;
    // this.$options表示是Vue中的参数,如若我们细心的话我们发现vue框架的可读属性都是$开头的
    vm.$options = options;

    // MVVM原理 重新初始化数据  data
    initState(vm)

    // 初始化渲染页面
    if (vm.$options.el){
        vm.$mount()
    }
}
```
$mount的功能很显然就是
1. 先获得dom树，
2. 然后替换dom树中的数据，
3. 然后再把新dom挂载到页面上去

我们看下实现代码

```js
MyVue.prototype.$mount = function () {
    let vm = this
    let el = vm.$options.el
    el = vm.$el = query(el) //获取当前节点

    let updateComponent = () =>{
        console.log("更新和渲染的实现");
        vm._update()
    }
    new Watcher(vm,updateComponent)
}
```
显然，我们并没有看到上面所说的
1. 先获得dom树，
2. 然后替换dom树中的数据，
3. 然后再把新dom挂载到页面上去，

那肯定是把 这些步骤放在 `vm._update()`的时候实现了。
我们来看下update代码

```js
// 拿到数据更新视图
MyVue.prototype._update = function () {
    let vm = this
    let el = vm.$el
    // 1. 获取dom树
    let node = document.createDocumentFragment()
    let firstChild
    while (firstChild = el.firstChild){
        node.appendChild(firstChild)
    }
    // 2.然后替换dom树中的数据，
    compiler(node,vm)

    //3.然后再把新dom挂载到页面上去，
    el.appendChild(node) 
}
```
可见，这三个步骤在update的时候实现了。

而这个update方法的执行需要 

```js
    let updateComponent = () =>{
        console.log("更新和渲染的实现");
        vm._update()
    }
```
这个方法的执行，
显然，这个方法是new Wacther的时候执行的。

```js
let id = 0
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts){
        this.vm = vm
        this.exprOrFn = exprOrFn
        this.cb = cb
        this.id = id++
        if (typeof exprOrFn === 'function'){
            this.getter = exprOrFn
        }
        this.get()  // 创建一个watcher，默认调用此方法
    }
    get(){
        this.getter()
    }
}
export default Watcher
```
可见，this.getter就是我们传进去的`updateComponent`，然后在new Wacther的时候，就自动执行了。

总结下思路，
1. new Watcher的时候执行了 `updateComponent`
2. 执行 `updateComponent` 的时候执行了 `update`
3. 执行update的时候执行了 1. 先获得dom树，2. 然后替换dom树中的数据，3. 然后再把新dom挂载到页面上去

现在我们就已经实现了初始化渲染。即把dom中{{}}表达式换成了data里的数据。

上面用到的compile方法我们还没解释，其实，很简单

```js
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
        node.textContent = node.textContent.replace(defaultRGE,function (...arg) {
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
```


## 5.更新数据渲染页面
我们上一节只实现了 初始化渲染，这一节来实现 数据一旦修改就重新渲染页面。上一节中，我们是通过new Watcher()来初始化页面的，也就是说这个watcher具有重新渲染页面的功能，因此，我们一旦改数据的时候，就再一次让这个watcher执行刷新页面的功能。这里有必要解释下一个watcher对应一个组件，也就是说你new Vue 机会生成一个wacther，因此有多个组件的时候就会生成多个watcher。

现在，我们给每一个data里的属性生成一个对应的dep。
例如：

```js
data:{
  age:18,
  friend:{
    name:"赵丽颖",
    age:12
  }
}
```
上面中，age,friend,friend.name,friend.age分别对应一个dep。一共四个dep。dep的功能是用来通知上面谈到的watcher执行刷新页面的功能的。

```js
export function defineReactive(data,key,value) {
    // 观察value是不是对象，是的话需要监听它的属性。
    observe(value)
    let dep = new Dep() // 新增代码：一个key对应一个dep
    Object.defineProperty(data,key,{
        get(){
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
            observe(value)
        }
    })
}
```
现在有一个问题，就是dep要怎么跟watcher关联起来，我们可以把watcher存储到dep里



```js
let id = 0
class Dep {
    constructor(){
        this.id = id++
        this.subs = []
    }
    addSub(watcher){ //订阅
        this.subs.push(watcher)
    }
}
```
如代码所示，我们希望执行addSub方法就可以将watcher放到subs里。
那什么时候可以执行addSub呢？

我们在执行compile的时候，也就是将dom里的{{}}表达式换成data里的值的时候，因为要获得data里的值，因此会触发get。这样，我们就可以在get里执行addSub。而watcher是放在全局作用域的，我们可以直接重全局作用域中拿这个watcher放到传入addSub。

好了，现在的问题就是，怎么把watcher放到全局作用域
```js
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
}
export default Watcher
```
可见，是通过pushTarget(this)放到全局作用域，再通过popTarget()将它移除。

要知道，wachter和dep是多对多的关系，dep里要保存对应的watcher，watcher也要保存对应的dep
因此，但我们触发get的时候，希望可以同时让当前的watcher保存当前的dep，也让当前的dep保存当前的wacther

```js
export function defineReactive(data,key,value) {
    // 观察value是不是对象，是的话需要监听它的属性。
    observe(value)
    let dep = new Dep()
    Object.defineProperty(data,key,{
        get(){
            if (Dep.target){
                dep.depend() //让dep保存watcher，也让watcher保存这个dep
            }
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
            observe(value)

        }
    })
}
```

让我们看下depend方法怎么实现


```js
let id = 0
class Dep {
    constructor(){
        this.id = id++
        this.subs = []
    }
    addSub(watcher){ //订阅
        this.subs.push(watcher)
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
    Dep.target = watcher
    stack.push(watcher)
}
export function popTarget() {
    stack.pop()
    Dep.target = stack[stack.length - 1]
}

export default Dep

```
可见depend方法又执行了watcher里的addDep，看一下watcher里的addDep。

```js
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

```

如此一来，就让dep和watcher实现了双向绑定。
这里代码，你可能会有个疑问，就是为什么是用一个stack数组来保存watcher，这里必须解释下，因为每一个watcher是对应一个组件的，也就是说，当页面中有多个组件的时候，就会有多个watcher，而多个组件的执行是依次执行的，也就是说Dep.target中 只会有 当前被执行的组件所对应的watcher。

例如，有一道面试题：父子组件的执行顺序是什么？

答案：在组件开始生成到结束生成的过程中，如果该组件还包含子组件，则自己开始生成后，要让所有的子组件也开始生成，然后自己就等着，直到所有的子组件生成完毕，自己再结束。“父亲”先开始自己的created，然后“儿子”开始自己的created和mounted，最后“父亲”再执行自己的mounted。

为什么会这样，到这里我们就应该发现了，new Vue的时候是先执行initData，也就是初始化数据，然后执行$mounted,也就是new Watcher。而初始化数据的时候，也要处理components里的数据。处理component里的数据的时候，每处理一个子组件就会new Vue，生成一个子组件。因此是顺序是这样的。也就对应了上面的答案。
1. 初始化父组件数据-->
2. 初始化 子组件数据 -->
3. new 子组件Wacther -->
4. new 父组件Watcher

好，言归正传，回到我们的项目来，接下来要实现的就是 当有数据更改的时候，我们要重新渲染页面。而我们可以通过set来监听数据是否被更改，因此基本步骤为：

1. set监听到数据被更改
2. 让dep执行dep.notify()通知与它相关的watcher
3. watcher执行update，重新渲染页面


```js
 Object.defineProperty(data,key,{
        get(){
            if (Dep.target){
                dep.depend() //让dep保存watcher，也让watcher保存这个dep
            }
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
            observe(value)

            // 当设置属性的时候，通知watcher更新
            dep.notify()

        }
    })
```

dep添加notify方法
```js
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
```


watcher添加update方法
```js
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
```

## 5. 批量更新防止重复渲染

上面我们是每更改一个数据，就会通知watcher重新渲染页面，显然，要是我们在一个组件里更改多个数据，那么就会多次通知wathcer渲染页面，因此这节我们来实现 批量更新，防止重复渲染。
怎么解决呢？

我们知道，每更新一个数据，就会触发dep.notify。而如果组件里的多个数据都更新的话，就会多次触发dep.notyfy。因为是同一个组件里的数据，因此，这些dep.notify通知的是同一个watcher 执行update。显然，这是没必要的，我们只希望先让所有的数据都修改完，再统一让watcher执行一次update。

该怎么实现呢？我们可以创建一个数组queue，来放置即将渲染页面的watcher。所以，我们先要判断这些dep通知的是不是同一个watcher。不相同的话就放入queue里，相同的就不放。（queue就是个去重数组）。基于此，我们可以更改Watcher里的update方法。



```js
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts){
        。。。
        this.get()  // 创建一个watcher，默认调用此方法
    }
    get(){
        pushTarget(this)
        this.getter()
        popTarget()
    }
    update(){
        // this.get()
        queueWacther(this) //修改代码
    }
    // 新增代码
    run(){
        this.get()
    }

}
// 新增代码
let has = {}
let queue = []
function queueWacther(watcher) {
    let id = watcher.id
    if(has[id] == null){
        has[id] = true
        queue.push(watcher)
    }
}
```
这样一来，queue里放置的就是不同的wathcer。

接下，再执行queue里的watcher.run。

```js
let has = {}
let queue = []
// 新增代码
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
}
```
记得执行完要清空queue队列。

但是有个重要的事情，就是queue里的watcher.run必须要异步执行。


现在就是要异步执行queue里的watcher.run()。
我们可以把重新渲染的动作放到异步队列里（可以通过promise.then放到微任务队列里）。而修改数据是在主线程上的，因此，会先执行完主线程才会执行异步队列里的方法。


```js
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
    nextTick(flushQueue) //新增代码：异步执行flushQueue
}
//新增代码：异步执行flushQueue
function nextTick(flushQueue) {
    Promise.resolve().then(flushQueue)
}
```
实际上这就已经完成了批量更新和防止重复渲染。

但是为了贴近vue源码，我们更改下nextTick。使用vue的相信都用过nextTick，因此也就是说我们会在其他地方调用nextTick，而且我们是经常这样使用的

```js
this.$nextTick(() => {
    this.msg2 = this.$refs.msgDiv.innerHTML
})
```
也就是说我们会传进个回调函数，而我们上面写的nextTick参数也是一个回调函数。
那么我们可以把其他地方调用nextTick的回调函数 一起整合进一个callback，然后统一执行callback。


因此，我们做如下更改
```js
// 新增代码
let callbacks = []
function flushCallbacks() {
    callbacks.forEach(cb=>cb())
    callbacks = []
}

function nextTick(flushQueue) {
    callbacks.push(flushQueue) //新增代码

    Promise.resolve().then(flushCallbacks
}
```

## 6.实现数组依赖收集
上面我们只是对数组实现了方法的拦截，还没实现数据的更新渲染。
现在要解决连个问题
1. 在哪里收集依赖
2. 依赖保存在哪里

实际上依赖收集依旧是在getter里实现的。

因为当我们 获取`list:[1,2,3]`的时候会触发get，所以可以在getter里收集依赖。

那保存在哪里呢？保存在Observe里，因为在拦截方法中可以获得observe，而在set里也可以获得observe。


```js
class Observe {
    constructor(data){ // data就是我们定义的data vm._data实例
        // 将用户的数据使用defineProperty定义
        // 创建数组专用 的dep
        this.dep = new Dep()
        // 给我们的对象包括我们的数组添加一个属性__ob__ (这个属性即当前的observe)
        Object.defineProperty(data,'__ob__',{
            get:() => this
        })
        if (Array.isArray(data)){
            data.__proto__ = arrayMethods
            observerArray(data)
        }else {
            this.walk(data)
        }
    }
   
}
```
我们在这里返回了一个Observe对象。

然后我们需要在拦截方法里notify

```js
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
```

现在保存依赖和通知更新的问题都解决了，下一步就是在setter里依赖收集

## 7.watch的实现

现在在initState中添加初始化watch

```js
export function initState(vm) {
    let opt = vm.$options
    if (opt.data){
        initData(vm);
    }
    if (opt.watch){
        initWathch(vm);
    }
}
```

我们现在原型对象上实现一个方法

```js
MyVue.prototype.$watch = function (key,handler) {
    let vm = this
    new Watcher(vm,key,handler,{user:true})
    
}
```
这个方法为我们的watch中的key 单独创建了一个Watch实例，其中handler是回调方法。

我们希望初始化（即 new Watch ）的时候，先获得key的oldValue。方便后面和newValue比较是否发生变化。


```js
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts){
        // 省略其他代码
        if (typeof exprOrFn === 'function'){
            this.getter = exprOrFn
        }else{
            // 现在exprOrFn是我们传进来的key
            this.getter = function () {
                return util.getValue(vm,key)
            }
        }
        this.value = this.get() //获得老值oldValue
        // 创建一个watcher，默认调用此方法
    }
    get(){
        pushTarget(this)
        let value = this.getter()
        popTarget()
        return value
    }

```

当key的值改变的时候，会触发dep.notify。也就会触发wathcer.update ,然后触发watcher.run 

我们在 run中获得新值，然后 将新值与老值进行比较，如果两者不等的话，就触发回调函数
```js
    run(){
        let value = this.get()
        if (this.value !== value){
            this.cb(value,this.value)
        }
    }
```

ok，现在来继续初始化initWatch

```js
function initWathch(vm) {
    let watch = vm.$options.watch
    for (let key in watch){
        let handler = watch[key]
        createWatch(vm,key,handler)
    }
}
function createWatch(vm,key,handler) {
    return this.$watch(vm,key,handler)
}
```
可见，其实核心思想就是给每个key 生成一个Watcher实例，来监听key的值的变化。


## 8. computed 实现

想要写computed，必须先知道computed 是有缓存的。

先来初始化computed


```js
function initComputed(vm,computed) {
    let watchers = vm._watcherComputed = Object.create(null)
    for(let key in computed){
        let userDef = computed[key]
        watchers[key] = new Watcher(vm,userDef,()=>{},{lazy:true})
    }
}
```

可见，是先生成一个__watcherComputed的空对象挂载都vm里，
然后遍历computed，给每个computed 生成一个Watcher实例，一个key对应一个Wacther实例。
然后保存到_watcherComputed里。

现在修改一下watcher，我们每new Watcher的时候就计算好key对应的值。然后保存在Watcher实例里。

现在我们不希望自动调用Watcher里的get方法。当 computed的值改变时，再执行get，也就是computed的所有数据依赖有改变的时候再执行get（）。


```js
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts){
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
```

当用户取值的时候，我们将key定义到vm上，并且返回value


```js
function createComputedGetter(vm,key) {
    let watcher = vm._watcherComputed[key]
    return function () {
        if (watch) {
            if (watcher.dirty){
                // 页面取值的时候，dirty如果为true，就会调用get方法计算
                watcher.evalValue()
            }
            return watcher.value
        }
    }
}
function initComputed(vm,computed) {
    let watchers = vm._watcherComputed = Object.create(null)
    for(let key in computed){
        let userDef = computed[key]
        watchers[key] = new Watcher(vm,userDef,()=>{},{lazy:true})

        // 当用户取值的时候，我们将key定义到vm上
        Object.defineProperty(vm,key,{
            get:createComputedGetter(vm,key)
        })
    }
```
`evalValue`方法的实现非常简单


```js
    evalValue(){
        this.value = this.get()
        this.dirty = false
    }
```
现在已经成功获得computed返回的值了，

接下来，要实现的是，当computed的依赖列表中，有变化的话，就要把dirty设置为true，重新赋予value新值

当computed里的依赖列表有变化时，就通知watcher.update。需要把dirty改为true。


```js
    update(){
        // this.get()
        // 批量更新， 防止重复渲染
        if (this.lazy){ // 如果是计算属性
            this.dirty = true
        }else{
            queueWacther(this)
        }
    }
```

现在解决依赖收集的问题

```js

function createComputedGetter(vm,key) {
    let watcher = vm._watcherComputed[key]
    return function () {
        if (watcher) {
            if (watcher.dirty){
                // 页面取值的时候，dirty如果为true，就会调用get方法计算
                watcher.evalValue()
            }
            if (Dep.target){
                watcher.depend()
            }
            return watcher.value
        }
    }
}
```


```js
    depend(){
        let i = this.deps.length
        while(i--){
            this.deps[i].depend()
        }
    }
```





源码地址：https://github.com/peigexing/myvue

