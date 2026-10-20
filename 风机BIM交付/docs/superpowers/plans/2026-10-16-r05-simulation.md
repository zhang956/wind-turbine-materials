# R05 风况仿真实施计划
用户已确认2026-10-16-wind-simulation-design.md，直接在现有交付目录实施，不提交Git。
- [x] tests/simulation.test.mjs：先验证方向跨界、迟滞、强风、暂停与时间步。
- [x] viewer/simulation.mjs：纯状态计算，createState/step/angleDelta接口；所有阈值为教学设定。
- [x] viewer/motion.js：缓存构件原始世界矩阵，以塔顶、轮毂和叶根旋转矩阵组合实现运动；保持源模型不变。
- [x] viewer/simulation-panel.js与index.html：风况输入、场景、控制状态和观察按钮；viewer.js集成帧循环和复位。
- [x] 实际GLB几何测试验证固定塔筒、旋转中心和复位；打包离线HTML，同步dist，记录浏览器限制。

浏览器启动因套接字权限受限；交互实测保留待验收。
