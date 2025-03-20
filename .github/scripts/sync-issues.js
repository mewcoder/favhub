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

// 定义标签到分类的映射
const CATEGORY_LABELS = {
  'website': '网站',
  'tool': '工具',
  'article': '文章',
  'video': '视频',
  'book': '书籍',
  'other': '其他'
};

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
  
  // 尝试从Issue模板中提取字段
  for (const line of bodyLines) {
    if (line.includes('链接:') || line.includes('URL:')) {
      url = line.split(':').slice(1).join(':').trim();
    } else if (line.includes('描述:') || line.includes('简介:')) {
      description = line.split(':').slice(1).join(':').trim();
    }
  }
  
  // 如果没有找到格式化的描述，使用整个正文
  if (!description && issue.body) {
    description = issue.body.substring(0, 200) + (issue.body.length > 200 ? '...' : '');
  }
  
  // 提取标签/分类
  const labels = issue.labels.map(label => 
    typeof label === 'string' ? label : label.name
  );
  
  // 确定主分类
  let category = '其他';
  for (const label of labels) {
    if (CATEGORY_LABELS[label.toLowerCase()]) {
      category = CATEGORY_LABELS[label.toLowerCase()];
      break;
    }
  }
  
  // 提取标签（除了分类标签）
  const tags = labels.filter(label => 
    !Object.keys(CATEGORY_LABELS).includes(label.toLowerCase())
  );
  
  return {
    id: issue.number,
    title,
    url,
    description,
    category,
    tags,
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
    
    // 按分类组织数据
    const categorizedData = {};
    for (const item of favorites) {
      if (!categorizedData[item.category]) {
        categorizedData[item.category] = [];
      }
      categorizedData[item.category].push(item);
    }
    
    // 写入总数据
    fs.writeFileSync(
      path.join(dataDir, 'favorites.json'),
      JSON.stringify(favorites, null, 2)
    );
    
    // 为每个分类创建单独的JSON文件
    for (const [category, items] of Object.entries(categorizedData)) {
      fs.writeFileSync(
        path.join(dataDir, `${category}.json`),
        JSON.stringify(items, null, 2)
      );
    }
    
    console.log('成功更新收藏数据');
  } catch (error) {
    console.error('处理Issues时出错:', error);
    process.exit(1);
  }
}

main(); 