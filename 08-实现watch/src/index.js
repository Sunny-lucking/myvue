import MyVue from "../source/index"

let vm = new MyVue({
    el: '#app',
    data(){
        return{
            message:'大家好',
            haha:"1",
            wife:{
                name:"angelababy",
                age:28
            },
            arr:[1,2,{name:"赵丽颖"}]
        }
    },
    watch:{
        message(newValue,oldValue){
            console.log("watch啊啊啊啊啊");
            console.log(newValue,oldValue);
        }
    },
    computed:{
        happy(){
            return this.haha + 125
        }
    }
})

setTimeout(()=>{
    vm.message = "我更新了"
    // vm.haha = 2
    // vm.arr.push(4)
},5000)

// let vm2 = new MyVue({
//     el: '#app2',
//     data(){
//         return{
//             message:'组件2',
//             wife:{
//                 name:"迪丽热吗",
//                 age:28
//             },
//             arr:[1,2,{name:"赵丽颖"}]
//         }
//     }
// })
