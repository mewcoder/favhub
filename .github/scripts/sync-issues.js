const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// 创建数据目录（如果不存在）
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function main() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  // 获取仓库信息
  const repoInfo = {
    owner: process.env.GITHUB_REPOSITORY.split('/')[0],
    repo: process.env.GITHUB_REPOSITORY.split('/')[1],
  };

  console.log(`正在获取 ${repoInfo.owner}/${repoInfo.repo} 的收藏数据...`);

  try {
    // 获取所有打开的issues
    const { data: issues } = await octokit.issues.listForRepo({
      ...repoInfo,
      state: 'open',
      per_page: 100,
    });

    // 用于收集所有标签
    const allTagsSet = new Set();
    
    // 过滤并处理收藏数据
    const favorites = issues.map(issue => {
      // 从issue标题中提取名称
      const title = issue.title.replace(/^\[收藏\]\s*/, '').trim();

      // 获取标签
      const labels = issue.labels
        .map(label => (typeof label === 'string' ? label : label.name))
        .filter(label => label !== '待分类');

      // 从issue的body中提取URL和描述
      const bodyLines = issue.body.split('\n');
      let url = '';
      let description = '';
      let customTags = [];

      bodyLines.forEach(line => {
        if (line.includes('链接') && !url) {
          const match = line.match(/https?:\/\/[^\s"]+/);
          if (match) url = match[0];
        }
        if (line.includes('描述') && !description) {
          const descIndex = bodyLines.indexOf(line);
          if (descIndex !== -1 && bodyLines[descIndex + 1]) {
            description = bodyLines[descIndex + 1].trim();
          }
        }
        if (line.includes('自定义标签') && line.includes(':')) {
          const tagText = line.split(':')[1].trim();
          if (tagText) {
            customTags = tagText.split(',').map(tag => tag.trim());
          }
        }
      });

      // 合并所有标签
      const allTags = [...labels, ...customTags].filter(Boolean);
      
      // 将所有标签添加到集合中
      allTags.forEach(tag => allTagsSet.add(tag));
      
      return {
        id: issue.number,
        title,
        url,
        description,
        tags: allTags,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    });

    // 写入收藏数据JSON文件
    fs.writeFileSync(
      path.join(dataDir, 'favorites.json'),
      JSON.stringify(favorites, null, 2)
    );
    
    // 将所有标签转换为数组并写入tags.json
    const allTagsArray = Array.from(allTagsSet).sort();
    fs.writeFileSync(
      path.join(dataDir, 'tags.json'),
      JSON.stringify(allTagsArray, null, 2)
    );

    console.log(`成功保存了 ${favorites.length} 个收藏项目到 data/favorites.json`);
    console.log(`成功保存了 ${allTagsArray.length} 个标签到 data/tags.json`);
  } catch (error) {
    console.error('获取收藏数据时发生错误:', error);
    process.exit(1);
  }
}

main(); 