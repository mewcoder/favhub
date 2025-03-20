// 当弹出窗口打开时执行
document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const bookmarkForm = document.getElementById('bookmark-form');
  const titleInput = document.getElementById('title');
  const urlInput = document.getElementById('url');
  const descInput = document.getElementById('description');
  const repoInput = document.getElementById('github-repo');
  const saveRepoBtn = document.getElementById('save-repo');
  const repoStatus = document.getElementById('repo-status');
  const submitButton = document.getElementById('submit-button');
  const buttonText = document.getElementById('button-text');
  const loadingSpinner = document.getElementById('loading-spinner');
  const statusMessage = document.getElementById('status-message');

  // 从当前活动标签页获取信息
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs[0]) {
      const currentTab = tabs[0];
      
      // 设置表单初始值
      titleInput.value = currentTab.title || '';
      urlInput.value = currentTab.url || '';
      
      // 如果网站有描述元标记，尝试获取它
      chrome.scripting.executeScript({
        target: {tabId: currentTab.id},
        function: function() {
          const metaDescription = document.querySelector('meta[name="description"]');
          return metaDescription ? metaDescription.getAttribute('content') : '';
        }
      }, function(results) {
        if (results && results[0] && results[0].result) {
          descInput.value = results[0].result;
        }
      });
    }
  });

  // 从存储中加载GitHub仓库信息
  loadRepositoryInfo();

  // 保存仓库信息
  saveRepoBtn.addEventListener('click', function() {
    const repoValue = repoInput.value.trim();
    
    // 验证仓库格式：username/repository
    if (repoValue && /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+$/.test(repoValue)) {
      chrome.storage.sync.set({githubRepo: repoValue}, function() {
        repoStatus.textContent = `已保存: ${repoValue}`;
        repoStatus.style.color = '#047857';
      });
    } else {
      repoStatus.textContent = '请输入有效的仓库格式: 用户名/仓库名';
      repoStatus.style.color = '#b91c1c';
    }
  });

  // 表单提交处理
  bookmarkForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    // 获取表单数据
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    const description = descInput.value.trim();
    const repoPath = repoInput.value.trim();
    
    // 获取选中的标签
    const selectedTags = [];
    document.querySelectorAll('input[name="tags"]:checked').forEach(function(checkbox) {
      selectedTags.push(checkbox.value);
    });
    
    // 验证
    if (!title || !url || !repoPath) {
      showStatus('请填写所有必填字段（标题、网址和GitHub仓库）', 'error');
      return;
    }
    
    // 验证仓库格式：username/repository
    if (!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+$/.test(repoPath)) {
      showStatus('请输入有效的仓库格式: 用户名/仓库名', 'error');
      return;
    }
    
    // 设置加载状态
    setLoadingState(true);
    
    // 创建GitHub Issue
    createGitHubIssue(repoPath, title, url, description, selectedTags)
      .then(response => {
        if (response.html_url) {
          showStatus('收藏成功！', 'success');
          setTimeout(() => {
            window.close(); // 关闭弹出窗口
          }, 1500);
        } else {
          throw new Error('创建Issue失败');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        showStatus('创建收藏失败，请检查仓库信息和网络连接', 'error');
      })
      .finally(() => {
        setLoadingState(false);
      });
  });

  // 辅助函数: 加载保存的仓库信息
  function loadRepositoryInfo() {
    chrome.storage.sync.get('githubRepo', function(data) {
      if (data.githubRepo) {
        repoInput.value = data.githubRepo;
        repoStatus.textContent = `已保存: ${data.githubRepo}`;
        repoStatus.style.color = '#047857';
      }
    });
  }

  // 辅助函数: 创建GitHub Issue
  async function createGitHubIssue(repoPath, title, url, description, tags) {
    // 分割仓库路径为用户名和仓库名
    const [owner, repo] = repoPath.split('/');
    
    // 构造Issue URL
    const issueUrl = `https://github.com/${owner}/${repo}/issues/new?title=${encodeURIComponent(`[收藏] ${title}`)}&labels=favorites&body=${encodeURIComponent(
      `### 链接\n${url}\n\n### 描述\n${description || ''}\n\n### 标签\n${tags.join(', ') || ''}`
    )}`;
    
    // 在新标签页中打开GitHub Issue创建页面
    const newTab = await chrome.tabs.create({url: issueUrl, active: true});
    
    // 由于浏览器扩展限制，我们不能直接访问GitHub API，
    // 而是打开Issue创建页面让用户手动提交
    return {html_url: issueUrl};
  }

  // 辅助函数: 显示状态消息
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    statusMessage.classList.remove('hidden');
    
    // 5秒后隐藏消息
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 5000);
  }

  // 辅助函数: 设置加载状态
  function setLoadingState(isLoading) {
    if (isLoading) {
      loadingSpinner.classList.remove('hidden');
      buttonText.textContent = '保存中...';
      submitButton.disabled = true;
    } else {
      loadingSpinner.classList.add('hidden');
      buttonText.textContent = '保存收藏';
      submitButton.disabled = false;
    }
  }
}); 