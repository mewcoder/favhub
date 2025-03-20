// 全局变量
let allFavorites = [];
let filteredFavorites = [];
let currentCategory = 'all';
let repoInfo = null;

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
    
    const response = await fetch('data/favorites.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    allFavorites = data;
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

// 渲染收藏列表
function renderFavorites() {
  const container = document.getElementById('favorites-container');
  container.innerHTML = '';
  
  const template = document.getElementById('favorite-template');
  
  if (filteredFavorites.length === 0) {
    document.getElementById('no-results').classList.remove('hidden');
    return;
  }
  
  document.getElementById('no-results').classList.add('hidden');
  
  filteredFavorites.forEach(favorite => {
    const clone = template.content.cloneNode(true);
    
    // 填充内容
    const titleLink = clone.querySelector('.favorite-link');
    titleLink.textContent = favorite.title;
    titleLink.href = favorite.url;
    
    const description = clone.querySelector('.favorite-description');
    description.textContent = favorite.description || '没有描述';
    
    const category = clone.querySelector('.favorite-category');
    category.textContent = favorite.category;
    
    const tagsContainer = clone.querySelector('.favorite-tags');
    if (favorite.tags && favorite.tags.length > 0) {
      favorite.tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 mb-2';
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });
    }
    
    const date = clone.querySelector('.favorite-date');
    date.textContent = formatDate(favorite.created_at);
    
    container.appendChild(clone);
  });
}

// 过滤收藏项
function filterFavorites(category, searchQuery = '') {
  currentCategory = category;
  
  filteredFavorites = allFavorites.filter(item => {
    // 分类过滤
    const categoryMatch = category === 'all' || item.category === category;
    
    // 搜索过滤
    if (!searchQuery) {
      return categoryMatch;
    }
    
    const query = searchQuery.toLowerCase();
    const titleMatch = (item.title || '').toLowerCase().includes(query);
    const descMatch = (item.description || '').toLowerCase().includes(query);
    const tagsMatch = (item.tags || []).some(tag => 
      tag.toLowerCase().includes(query)
    );
    
    return categoryMatch && (titleMatch || descMatch || tagsMatch);
  });
  
  renderFavorites();
}

// 更新分类导航激活状态
function updateCategoryNav(category) {
  const navItems = document.querySelectorAll('#category-nav li');
  navItems.forEach(item => {
    if (item.getAttribute('data-category') === category) {
      item.classList.add('bg-blue-500', 'text-white');
      item.classList.remove('hover:bg-blue-100');
    } else {
      item.classList.remove('bg-blue-500', 'text-white');
      item.classList.add('hover:bg-blue-100');
    }
  });
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
function updateNewFavoriteLink() {
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
  
  // 设置分类导航事件监听
  const categoryNav = document.getElementById('category-nav');
  categoryNav.addEventListener('click', event => {
    const target = event.target;
    if (target.tagName === 'LI') {
      const category = target.getAttribute('data-category');
      updateCategoryNav(category);
      filterFavorites(category, document.getElementById('search-input').value);
    }
  });
  
  // 设置搜索事件监听
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('search-input');
  
  searchButton.addEventListener('click', () => {
    filterFavorites(currentCategory, searchInput.value);
  });
  
  searchInput.addEventListener('keyup', event => {
    if (event.key === 'Enter') {
      filterFavorites(currentCategory, searchInput.value);
    }
  });
}

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp); 