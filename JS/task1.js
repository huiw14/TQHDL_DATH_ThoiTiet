// File js/task1.js

// Lắng nghe sự kiện "dataChanged" từ main.js
document.addEventListener("dataChanged", function(e) {
    const data = e.detail.data; // Data của vùng đang được chọn
    
    // Logic code D3.js vẽ chart Task 1 bắt đầu từ đây
    console.log("Task 1 nhận được data mới, số dòng:", data.length);
    
    // Ví dụ chọn khung của mình để vẽ:
    // const svg = d3.select("#chart-task1");
    // svg.selectAll("*").remove(); 
    // ... [Copy template line_chart.html của thầy vào đây] ...
    
    // Nhớ dùng d3.transition()
});