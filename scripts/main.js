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
    
    // 加载所有收藏
    const favResponse = await fetch('data/favorites.json');
    if (!favResponse.ok) {
      throw new Error(`HTTP error! status: ${favResponse.status}`);
    }
    
    // 加载所有标签
    const tagsResponse = await fetch('data/tags.json');
    if (!tagsResponse.ok) {
      throw new Error(`HTTP error! status: ${tagsResponse.status}`);
    }
    
    const favData = await favResponse.json();
    const tagsData = await tagsResponse.json();
    
    allFavorites = favData;
    allTags = tagsData;
    
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
  
  allTags.forEach(tag => {
    tagCounts[tag] = 0;
  });
  
  allFavorites.forEach(item => {
    item.tags.forEach(tag => {
      if (tagCounts[tag] !== undefined) {
        tagCounts[tag]++;
      } else {
        // 处理不在标签列表中的标签
        tagCounts[tag] = 1;
        allTags.push(tag);
      }
    });
  });
}

// 初始化标签选择器
function initTagSelector() {
  const tagsList = document.getElementById('tags-list');
  tagsList.innerHTML = '';
  
  const template = document.getElementById('tag-option-template');
  
  // 按标签数量排序
  const sortedTags = [...allTags].sort((a, b) => {
    return tagCounts[b] - tagCounts[a];
  });
  
  sortedTags.forEach(tag => {
    const clone = template.content.cloneNode(true);
    const option = clone.querySelector('.tag-option');
    const checkbox = clone.querySelector('.tag-checkbox');
    const nameSpan = clone.querySelector('.tag-name');
    const countSpan = clone.querySelector('.tag-count');
    
    nameSpan.textContent = tag;
    countSpan.textContent = `(${tagCounts[tag]})`;
    checkbox.value = tag;
    checkbox.checked = selectedTags.includes(tag);
    
    option.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      if (checkbox.checked) {
        addSelectedTag(tag);
      } else {
        removeSelectedTag(tag);
      }
    });
    
    // 防止点击checkbox时触发两次
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      if (checkbox.checked) {
        addSelectedTag(tag);
      } else {
        removeSelectedTag(tag);
      }
    });
    
    tagsList.appendChild(clone);
  });
  
  // 设置标签搜索功能
  const tagSearch = document.getElementById('tag-search');
  tagSearch.addEventListener('input', () => {
    const query = tagSearch.value.toLowerCase();
    document.querySelectorAll('.tag-option').forEach(option => {
      const tagName = option.querySelector('.tag-name').textContent.toLowerCase();
      if (tagName.includes(query)) {
        option.style.display = '';
      } else {
        option.style.display = 'none';
      }
    });
  });
  
  // 设置标签选择器下拉菜单
  const dropdownButton = document.getElementById('tags-dropdown-button');
  const dropdownMenu = document.getElementById('tags-dropdown-menu');
  
  dropdownButton.addEventListener('click', () => {
    dropdownMenu.classList.toggle('hidden');
  });
  
  // 点击外部关闭下拉菜单
  document.addEventListener('click', (event) => {
    if (!dropdownButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
      dropdownMenu.classList.add('hidden');
    }
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
  
  // 更新标签选择器中的复选框状态
  document.querySelectorAll('.tag-checkbox').forEach(checkbox => {
    if (checkbox.value === tag) {
      checkbox.checked = true;
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
    
    // 更新标签选择器中的复选框状态
    document.querySelectorAll('.tag-checkbox').forEach(checkbox => {
      if (checkbox.value === tag) {
        checkbox.checked = false;
      }
    });
  }
}

// 清除所有已选标签
function clearAllTags() {
  selectedTags = [];
  renderSelectedTags();
  applyFilters();
  
  // 更新标签选择器中的所有复选框状态
  document.querySelectorAll('.tag-checkbox').forEach(checkbox => {
    checkbox.checked = false;
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
    
    const tagsContainer = clone.querySelector('.favorite-tags');
    if (favorite.tags && favorite.tags.length > 0) {
      favorite.tags.forEach(tag => {
        const tagEl = document.createElement('span');
        
        // 已选中的标签高亮显示
        if (selectedTags.includes(tag)) {
          tagEl.className = 'bg-blue-500 text-white px-2 py-1 rounded mr-2 mb-2 cursor-pointer';
        } else {
          tagEl.className = 'bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 mb-2 cursor-pointer';
        }
        
        tagEl.textContent = tag;
        tagEl.addEventListener('click', () => {
          // 点击标签时切换选择状态
          if (selectedTags.includes(tag)) {
            removeSelectedTag(tag);
          } else {
            addSelectedTag(tag);
          }
        });
        
        tagsContainer.appendChild(tagEl);
      });
    }
    
    const date = clone.querySelector('.favorite-date');
    date.textContent = formatDate(favorite.created_at);
    
    container.appendChild(clone);
  });
}

// 应用筛选条件
function applyFilters() {
  filteredFavorites = allFavorites.filter(item => {
    // 标签筛选
    const tagMatch = selectedTags.length === 0 || 
                    selectedTags.every(tag => item.tags.includes(tag));
    
    // 搜索筛选
    if (!searchQuery) {
      return tagMatch;
    }
    
    const query = searchQuery.toLowerCase();
    const titleMatch = (item.title || '').toLowerCase().includes(query);
    const descMatch = (item.description || '').toLowerCase().includes(query);
    const tagsMatch = (item.tags || []).some(tag => 
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