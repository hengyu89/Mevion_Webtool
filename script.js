const btn = document.getElementsById("btn");
const demo = document.getElementById("demo");

btn.addEventListener("click", function() {
    demo.textContent = "You Clicked the button!";
});
