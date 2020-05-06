import MyVue from "../source/index"

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
// vm.arr.push(6)
console.log(vm)
