// 全局变量
let allFavorites = [];
let filteredFavorites = [];
let allTags = [];
let tagCounts = {};
let searchQuery = '';
let repoInfo = null;
let customRenderFunction = null; // 自定义渲染钩子

// 允许设置自定义标签渲染函数
function setCustomTagRenderer(renderFn) {
  if (typeof renderFn === 'function') {
    customRenderFunction = renderFn;
  }
}

// 工具函数
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 获取仓库信息
async function getRepoInfo() {
  try {
    // 从当前URL获取仓库信息
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split('/');
    
    // GitHub Pages URL格式为 username.github.io/repo-name
    // 或者自定义域名
    let username, repoName;
    
    if (url.hostname.endsWith('github.io')) {
      username = url.hostname.replace('.github.io', '');
      repoName = pathParts[1] || '';
    } else {
      // 尝试从页面中查找GitHub链接
      const metaTag = document.querySelector('meta[name="github-repo"]');
      if (metaTag) {
        const repoPath = metaTag.getAttribute('content');
        [username, repoName] = repoPath.split('/');
      } else {
        // 默认为当前网站的某些元素
        const footerLinks = document.querySelectorAll('footer a');
        for (const link of footerLinks) {
          if (link.href.includes('github.com')) {
            const ghUrl = new URL(link.href);
            const ghPathParts = ghUrl.pathname.split('/').filter(Boolean);
            if (ghPathParts.length >= 2) {
              username = ghPathParts[0];
              repoName = ghPathParts[1];
              break;
            }
          }
        }
      }
    }
    
    if (username && repoName) {
      return { username, repoName };
    }
    
    throw new Error('无法确定GitHub仓库信息');
  } catch (error) {
    console.error('获取仓库信息失败:', error);
    return null;
  }
}

// 从JSON文件加载数据
async function loadFavorites() {
  try {
    showLoading(true);
    
    // 加载收藏数据
    const favResponse = await fetch('data/favorites.json');
    if (!favResponse.ok) {
      throw new Error(`HTTP error! status: ${favResponse.status}`);
    }
    
    allFavorites = await favResponse.json();
    
    // 从收藏数据中提取所有唯一标签
    allTags = [];
    const tagSet = new Set();
    
    allFavorites.forEach(item => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          tagSet.add(tag);
        });
      }
    });
    
    // 将Set转换为数组
    allTags = Array.from(tagSet);
    
    // 计算每个标签的项目数量
    calculateTagCounts();
    
    // 初始化标签选择器
    initTagSelector();
    
    // 初始显示所有收藏
    filteredFavorites = [...allFavorites];
    renderFavorites();
    
    showLoading(false);
    
    return true;
  } catch (error) {
    console.error('加载数据失败:', error);
    showLoading(false);
    showError('数据加载失败，请稍后再试');
    return false;
  }
}

// 计算每个标签的数量
function calculateTagCounts() {
  tagCounts = {};
  
  // 初始化所有标签的计数为0
  allTags.forEach(tag => {
    if (tag && tag.trim() !== '') {
      tagCounts[tag] = 0;
    }
  });
  
  // 计算每个标签的出现次数
  allFavorites.forEach(item => {
    const itemTags = Array.isArray(item.tags) ? item.tags : [];
    
    itemTags.forEach(tag => {
      if (tag && tag.trim() !== '' && tagCounts[tag] !== undefined) {
        tagCounts[tag]++;
      }
    });
  });
}

// 初始化标签选择器（这个函数会被自定义的单选标签逻辑覆盖）
function initTagSelector() {
  // 此处留空，将由单选标签的实现覆盖
}

// 渲染收藏列表
function renderFavorites() {
  const container = document.getElementById('favorites-container');
  container.innerHTML = '';
  
  // 如果没有收藏显示空状态
  if (filteredFavorites.length === 0) {
    document.getElementById('no-results').classList.remove('hidden');
    return;
  } else {
    document.getElementById('no-results').classList.add('hidden');
  }
  
  const template = document.getElementById('favorite-template');
  
  filteredFavorites.forEach(favorite => {
    const clone = template.content.cloneNode(true);
    
    // 设置标题
    const titleSpan = clone.querySelector('.favorite-title');
    titleSpan.textContent = favorite.title || '无标题';
    
    // 设置URL
    const urlElement = clone.querySelector('.favorite-url .url-text');
    const link = clone.querySelector('.favorite-link');
    
    // 处理URL
    let displayUrl = '';
    try {
      const url = new URL(favorite.url);
      displayUrl = url.hostname + (url.pathname !== '/' ? url.pathname : '');
      // 截断过长的URL
      if (displayUrl.length > 40) {
        displayUrl = displayUrl.substring(0, 37) + '...';
      }
    } catch (e) {
      displayUrl = favorite.url || '';
      if (displayUrl.length > 40) {
        displayUrl = displayUrl.substring(0, 37) + '...';
      }
    }
    
    urlElement.textContent = displayUrl;
    link.href = favorite.url || '#';
    
    // 设置目标为新窗口打开
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // 设置描述
    const description = clone.querySelector('.favorite-description');
    description.textContent = favorite.description || '无描述';
    
    // 设置标签
    const tagsContainer = clone.querySelector('.favorite-tags');
    if (Array.isArray(favorite.tags) && favorite.tags.length > 0) {
      favorite.tags.forEach(tag => {
        if (!tag || tag.trim() === '') return;
        
        const tagElement = document.createElement('span');
        // 使用Tailwind默认类
        tagElement.className = 'tag text-[0.65rem] py-0.5 px-2 rounded-full whitespace-nowrap font-medium bg-indigo-50 text-indigo-600';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
      });
    }
    
    // 设置日期
    const dateElement = clone.querySelector('.favorite-date');
    const dateText = favorite.created_at ? formatDate(favorite.created_at) : '';
    dateElement.textContent = dateText;
    
    container.appendChild(clone);
  });
}

// 应用筛选条件
function applyFilters() {
  console.log('应用筛选，搜索词:', searchQuery);
  
  // 如果搜索词为空且没有自定义筛选函数，显示全部收藏
  if (!searchQuery && !customRenderFunction) {
    console.log('没有搜索词且没有自定义筛选，显示全部收藏');
    filteredFavorites = [...allFavorites];
    renderFavorites();
    return;
  }
  
  // 搜索筛选逻辑
  filteredFavorites = allFavorites.filter(item => {
    // 确保item.tags是数组
    const itemTags = Array.isArray(item.tags) ? item.tags : [];
    
    // 如果没有搜索词，返回true（不影响筛选）
    if (!searchQuery) {
      return true;
    }
    
    const query = searchQuery.toLowerCase();
    const titleMatch = (item.title || '').toLowerCase().includes(query);
    const descMatch = (item.description || '').toLowerCase().includes(query);
    const tagsMatch = itemTags.some(tag => 
      tag.toLowerCase().includes(query)
    );
    
    const isMatch = titleMatch || descMatch || tagsMatch;
    return isMatch;
  });
  
  console.log(`搜索结果: 找到 ${filteredFavorites.length} 个匹配项`);
  renderFavorites();
  
  // 如果存在自定义筛选函数，在搜索筛选后再应用
  if (customRenderFunction && typeof customRenderFunction === 'function') {
    console.log('应用自定义筛选函数');
    customRenderFunction('全部'); // 应用自定义筛选，但保留搜索结果
  }
}

// 显示/隐藏加载状态
function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// 显示错误信息
function showError(message) {
  const noResults = document.getElementById('no-results');
  noResults.innerHTML = `<p class="text-lg text-gray-600">${message}</p>`;
  noResults.classList.remove('hidden');
}

// 更新"添加新收藏"链接
async function updateNewFavoriteLink() {
  const repoInfo = await getRepoInfo();
  const link = document.getElementById('new-favorite-link');
  
  if (!repoInfo) {
    link.style.display = 'none';
    return;
  }
  
  const { username, repoName } = repoInfo;
  link.href = `https://github.com/${username}/${repoName}/issues/new?template=favorite.yml`;
}

// 初始化应用
async function initApp() {
  // 获取仓库信息
  repoInfo = await getRepoInfo();
  updateNewFavoriteLink();
  
  // 加载数据
  const success = await loadFavorites();
  if (!success) return;
  
  // 确保全局变量可被外部访问
  window.allTags = allTags;
  window.tagCounts = tagCounts;
  window.setCustomTagRenderer = setCustomTagRenderer;
  
  // 设置搜索事件监听
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('search-input');
  
  // 点击搜索按钮时搜索
  searchButton.addEventListener('click', () => {
    searchQuery = searchInput.value;
    applyFilters();
  });
  
  // 按下Enter键时搜索
  searchInput.addEventListener('keyup', event => {
    if (event.key === 'Enter') {
      searchQuery = searchInput.value;
      applyFilters();
    }
  });
  
  // 添加实时搜索功能
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    applyFilters();
  });
}

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp); 