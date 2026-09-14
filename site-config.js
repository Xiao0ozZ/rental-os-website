/*
 * Rental OS 官网部署配置
 *
 * 这是唯一需要在发布前按实际情况修改的配置文件。留空也可以直接打开和发布，
 * 此时“管理端登录”和“预约演示”会保持为安全的本地预览，不会向任何服务器发送数据。
 */
window.RENTAL_OS_SITE_CONFIG = {
  // 例如：https://admin.example.com/ 。留空则显示配置说明。
  adminUrl: "",

  // 例如：hello@example.com 。留空则预约表单只显示本地预览结果。
  // 配置后，提交表单会生成 mailto 草稿，由访客手动确认发送。
  demoEmail: "",
};
