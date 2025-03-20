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
    
    // 过滤只包含favorites标签的issues
    const favoriteIssues = issues.filter(issue => {
      const labels = issue.labels.map(label => 
        typeof label === 'string' ? label.toLowerCase() : label.name.toLowerCase()
      );
      return labels.includes('favorites') 
    });
    
    // 处理收藏数据
    const favorites = favoriteIssues.map(issue => {
      // 使用issue原始标题
      const title = issue.title.trim();

      // 获取自定义标签
      const bodyLines = issue.body.split('\n');
      let url = '';
      let description = '';
      let tags = [];

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
            tags = tagText.split(',').map(tag => tag.trim());
          }
        }
      });
      
      return {
        id: issue.number,
        title,
        url,
        description,
        tags: tags.filter(Boolean),
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    });

    // 写入收藏数据JSON文件
    fs.writeFileSync(
      path.join(dataDir, 'favorites.json'),
      JSON.stringify(favorites, null, 2)
    );

    console.log(`成功保存了 ${favorites.length} 个收藏项目到 data/favorites.json`);
  } catch (error) {
    console.error('获取收藏数据时发生错误:', error);
    process.exit(1);
  }
}

main(); 