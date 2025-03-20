// 全局变量
let allFavorites = [];
let filteredFavorites = [];
let allTags = [];
let tagCounts = {};
let selectedTags = [];
let searchQuery = '';
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
    
    // 只加载收藏数据
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

// 初始化标签选择器
function initTagSelector() {
  const tagsList = document.getElementById('tags-list');
  tagsList.innerHTML = '';
  
  // 如果没有标签，显示无标签消息
  if (allTags.length === 0) {
    tagsList.innerHTML = '<div class="py-1 text-white text-sm">没有可用的标签</div>';
    return;
  }
  
  const template = document.getElementById('tag-option-template');
  
  // 按标签数量排序
  const sortedTags = [...allTags].sort((a, b) => {
    return tagCounts[b] - tagCounts[a];
  });
  
  sortedTags.forEach(tag => {
    // 跳过空标签
    if (!tag || tag.trim() === '') return;
    
    const clone = template.content.cloneNode(true);
    const option = clone.querySelector('.tag-option');
    const nameSpan = clone.querySelector('.tag-name');
    const countSpan = clone.querySelector('.tag-count');
    
    nameSpan.textContent = tag;
    countSpan.textContent = `(${tagCounts[tag]})`;
    
    // 设置初始选中状态
    if (selectedTags.includes(tag)) {
      option.classList.add('bg-blue-300');
    }
    
    option.addEventListener('click', () => {
      const isSelected = selectedTags.includes(tag);
      if (isSelected) {
        removeSelectedTag(tag);
        option.classList.remove('bg-blue-300');
      } else {
        addSelectedTag(tag);
        option.classList.add('bg-blue-300');
      }
    });
    
    tagsList.appendChild(clone);
  });
  
  // 清除标签按钮
  document.getElementById('clear-tags').addEventListener('click', clearAllTags);
}

// 添加已选标签
function addSelectedTag(tag) {
  if (selectedTags.includes(tag)) return;
  
  selectedTags.push(tag);
  renderSelectedTags();
  applyFilters();
  
  // 更新标签列表中的选择状态
  document.querySelectorAll('.tag-option').forEach(option => {
    const tagName = option.querySelector('.tag-name').textContent;
    if (tagName === tag) {
      option.classList.add('bg-blue-300');
    }
  });
}

// 移除已选标签
function removeSelectedTag(tag) {
  const index = selectedTags.indexOf(tag);
  if (index !== -1) {
    selectedTags.splice(index, 1);
    renderSelectedTags();
    applyFilters();
    
    // 更新标签列表中的选择状态
    document.querySelectorAll('.tag-option').forEach(option => {
      const tagName = option.querySelector('.tag-name').textContent;
      if (tagName === tag) {
        option.classList.remove('bg-blue-300');
      }
    });
  }
}

// 清除所有已选标签
function clearAllTags() {
  selectedTags = [];
  renderSelectedTags();
  applyFilters();
  
  // 更新标签列表中的所有选择状态
  document.querySelectorAll('.tag-option').forEach(option => {
    option.classList.remove('bg-blue-300');
  });
}

// 渲染已选标签
function renderSelectedTags() {
  const container = document.getElementById('selected-tags');
  container.innerHTML = '';
  
  const template = document.getElementById('selected-tag-template');
  
  if (selectedTags.length === 0) {
    const emptyMsg = document.createElement('span');
    emptyMsg.className = 'text-gray-500 text-sm';
    emptyMsg.textContent = '未选择标签，显示全部收藏';
    container.appendChild(emptyMsg);
    return;
  }
  
  selectedTags.forEach(tag => {
    const clone = template.content.cloneNode(true);
    const tagEl = clone.querySelector('div');
    const tagName = clone.querySelector('.tag-name');
    const removeBtn = clone.querySelector('.remove-tag');
    
    tagName.textContent = tag;
    removeBtn.addEventListener('click', () => removeSelectedTag(tag));
    
    container.appendChild(clone);
  });
}

// 渲染收藏列表
function renderFavorites() {
  const container = document.getElementById('favorites-container');
  const noResults = document.getElementById('no-results');
  
  // 清空容器
  container.innerHTML = '';
  
  if (filteredFavorites.length === 0) {
    noResults.classList.remove('hidden');
  } else {
    noResults.classList.add('hidden');
  }
  
  // 使用模板渲染每个收藏项
  const template = document.getElementById('favorite-template');
  
  filteredFavorites.forEach(favorite => {
    const clone = template.content.cloneNode(true);
    
    const link = clone.querySelector('.favorite-link');
    link.href = favorite.url;
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
    
    const title = clone.querySelector('.favorite-title');
    title.textContent = favorite.title;
    
    const description = clone.querySelector('.favorite-description');
    description.textContent = favorite.description || '无描述';
    
    // 渲染标签
    const tagsContainer = clone.querySelector('.favorite-tags');
    tagsContainer.innerHTML = '';
    
    // 确保favorite.tags是数组
    const favoriteTags = Array.isArray(favorite.tags) ? favorite.tags : [];
    
    if (favoriteTags.length === 0) {
      const noTag = document.createElement('span');
      noTag.className = 'text-gray-300 text-[10px]';
      noTag.textContent = '无标签';
      tagsContainer.appendChild(noTag);
    } else {
      // 最多显示3个标签
      const displayTags = favoriteTags.slice(0, 3);
      
      displayTags.forEach(tag => {
        if (!tag || tag.trim() === '') return;
        
        const tagEl = document.createElement('div');
        tagEl.className = 'tag bg-gray-50 text-gray-500 cursor-pointer hover:bg-blue-50 hover:text-blue-500';
        tagEl.textContent = tag;
        
        tagEl.addEventListener('click', (e) => {
          e.preventDefault(); // 防止点击标签时触发卡片链接
          e.stopPropagation(); // 阻止事件冒泡
          if (!selectedTags.includes(tag)) {
            addSelectedTag(tag);
          }
        });
        
        tagsContainer.appendChild(tagEl);
      });
      
      // 如果有更多标签，显示+n
      if (favoriteTags.length > 3) {
        const moreTag = document.createElement('div');
        moreTag.className = 'tag bg-gray-50 text-gray-400';
        moreTag.textContent = `+${favoriteTags.length - 3}`;
        tagsContainer.appendChild(moreTag);
      }
    }
    
    const date = clone.querySelector('.favorite-date');
    date.textContent = formatDate(favorite.created_at);
    
    container.appendChild(clone);
  });
}

// 应用筛选条件
function applyFilters() {
  filteredFavorites = allFavorites.filter(item => {
    // 确保item.tags是数组
    const itemTags = Array.isArray(item.tags) ? item.tags : [];
    
    // 标签筛选
    const tagMatch = selectedTags.length === 0 || 
                    selectedTags.every(tag => itemTags.includes(tag));
    
    // 搜索筛选
    if (!searchQuery) {
      return tagMatch;
    }
    
    const query = searchQuery.toLowerCase();
    const titleMatch = (item.title || '').toLowerCase().includes(query);
    const descMatch = (item.description || '').toLowerCase().includes(query);
    const tagsMatch = itemTags.some(tag => 
      tag.toLowerCase().includes(query)
    );
    
    return tagMatch && (titleMatch || descMatch || tagsMatch);
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
  
  // 设置搜索事件监听
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('search-input');
  
  searchButton.addEventListener('click', () => {
    searchQuery = searchInput.value;
    applyFilters();
  });
  
  searchInput.addEventListener('keyup', event => {
    if (event.key === 'Enter') {
      searchQuery = searchInput.value;
      applyFilters();
    }
  });
}

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp); 