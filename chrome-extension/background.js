// 扩展安装或更新时初始化上下文菜单
chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单项
  chrome.contextMenus.create({
    id: 'add-to-favhub',
    title: '收藏到 favhub',
    contexts: ['page', 'link']
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-to-favhub') {
    // 选择正确的URL（如果是链接上下文，使用链接URL；否则使用页面URL）
    const url = info.linkUrl || info.pageUrl;
    const title = tab.title;
    
    // 获取保存的仓库信息
    chrome.storage.sync.get('githubRepo', (data) => {
      if (data.githubRepo) {
        const [owner, repo] = data.githubRepo.split('/');
        
        // 构造Issue URL
        const issueUrl = `https://github.com/${owner}/${repo}/issues/new?title=${encodeURIComponent(`[收藏] ${title}`)}&labels=favorites&body=${encodeURIComponent(
          `### 链接\n${url}\n\n### 描述\n\n\n### 标签\n其他`
        )}`;
        
        // 在新标签页中打开GitHub Issue创建页面
        chrome.tabs.create({url: issueUrl, active: true});
      } else {
        // 如果没有保存仓库信息，打开插件弹出窗口
        chrome.action.openPopup();
      }
    });
  }
});

// 可选：设置徽章通知
function updateBadge() {
  // 这里可以添加徽章通知逻辑，例如显示未同步的收藏数量
  // chrome.action.setBadgeText({text: '1'});
  // chrome.action.setBadgeBackgroundColor({color: '#4f46e5'});
}

// 监听来自弹出窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'bookmark-added') {
    // 更新徽章或执行其他操作
    updateBadge();
    sendResponse({status: 'success'});
  }
  return true;
}); 