const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// 创建Octokit实例
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// 从仓库URL获取仓库所有者和名称
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

// 确保数据目录存在
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 常用标签，用于生成单独的JSON文件
const COMMON_TAGS = [
  '网站', '工具', '文章', '视频', '书籍', '开发', '教程', 
  '设计', '效率', '前端', '后端', 'AI', '移动', '算法', '学习'
];

// 收藏特殊标识
const FAVORITE_IDENTIFIER = '[收藏]';

async function getIssues() {
  const allIssues = [];
  let page = 1;
  let hasMoreIssues = true;

  try {
    while (hasMoreIssues) {
      const response = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open', // 只获取打开的issue
        per_page: 100,
        page,
      });

      if (response.data.length === 0) {
        hasMoreIssues = false;
      } else {
        // 筛选出带有收藏标识的Issue
        const favoriteIssues = response.data.filter(issue => 
          issue.title.includes(FAVORITE_IDENTIFIER)
        );
        allIssues.push(...favoriteIssues);
        page++;
      }
    }

    console.log(`获取到 ${allIssues.length} 个收藏相关的Issues`);
    return allIssues;
  } catch (error) {
    console.error('获取Issues时出错:', error);
    return [];
  }
}

function parseIssue(issue) {
  // 提取标题（去除标识符）
  const title = issue.title.replace(FAVORITE_IDENTIFIER, '').trim();
  
  // 提取URL和描述
  const bodyLines = (issue.body || '').split('\n');
  let url = '';
  let description = '';
  let customTags = [];
  
  // 尝试从Issue模板中提取字段
  for (const line of bodyLines) {
    if (line.includes('链接:') || line.includes('URL:')) {
      url = line.split(':').slice(1).join(':').trim();
    } else if (line.includes('描述:') || line.includes('简介:')) {
      description = line.split(':').slice(1).join(':').trim();
    } else if (line.includes('自定义标签:')) {
      const customTagsText = line.split(':').slice(1).join(':').trim();
      if (customTagsText) {
        customTags = customTagsText.split(',').map(tag => tag.trim()).filter(Boolean);
      }
    }
  }
  
  // 如果没有找到格式化的描述，使用整个正文
  if (!description && issue.body) {
    description = issue.body.substring(0, 200) + (issue.body.length > 200 ? '...' : '');
  }
  
  // 提取所有标签
  const labels = issue.labels.map(label => 
    typeof label === 'string' ? label : label.name
  ).filter(label => label !== '待分类');
  
  // 合并自定义标签
  const allTags = [...new Set([...labels, ...customTags])];
  
  return {
    id: issue.number,
    title,
    url,
    description,
    tags: allTags,
    created_at: issue.created_at,
    updated_at: issue.updated_at
  };
}

async function main() {
  try {
    // 获取所有带收藏标识的issue
    const issues = await getIssues();
    
    // 解析每个issue
    const favorites = issues.map(parseIssue);
    
    // 按标签组织数据
    const taggedData = {};
    // 初始化常用标签的数组
    COMMON_TAGS.forEach(tag => {
      taggedData[tag] = [];
    });
    
    // 为每个收藏项添加到对应标签的数组中
    for (const item of favorites) {
      for (const tag of item.tags) {
        if (!taggedData[tag]) {
          taggedData[tag] = [];
        }
        taggedData[tag].push(item);
      }
    }
    
    // 写入总数据
    fs.writeFileSync(
      path.join(dataDir, 'favorites.json'),
      JSON.stringify(favorites, null, 2)
    );
    
    // 为每个标签创建单独的JSON文件
    for (const [tag, items] of Object.entries(taggedData)) {
      if (items.length > 0) {
        fs.writeFileSync(
          path.join(dataDir, `tag-${tag}.json`),
          JSON.stringify(items, null, 2)
        );
      }
    }
    
    // 写入所有标签列表
    const allTags = Object.keys(taggedData);
    fs.writeFileSync(
      path.join(dataDir, 'tags.json'),
      JSON.stringify(allTags, null, 2)
    );
    
    console.log('成功更新收藏数据');
  } catch (error) {
    console.error('处理Issues时出错:', error);
    process.exit(1);
  }
}

main(); 