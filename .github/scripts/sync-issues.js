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
    
    // 过滤标题以"[收藏]"开头的issues
    const favoriteIssues = issues.filter(issue => 
      issue.title.trim().startsWith('[收藏]')
    );
    
    // 处理收藏数据
    const favorites = favoriteIssues.map(issue => {
      // 使用issue原始标题，去掉"[收藏]"前缀
      const title = issue.title.trim().replace(/^\[收藏\]\s*/, '');

      // 获取自定义标签
      const bodyLines = issue.body ? issue.body.split('\n') : [];
      let url = '';
      let description = '';
      let tags = [];

      // 处理URL (在"链接"后面的行)
      for (let i = 0; i < bodyLines.length; i++) {
        if (bodyLines[i].includes('### 链接') && i + 1 < bodyLines.length) {
          // 检查下一行是否包含URL
          for (let j = i + 1; j < bodyLines.length; j++) {
            const nextLine = bodyLines[j].trim();
            if (nextLine && !nextLine.startsWith('###')) {
              const match = nextLine.match(/https?:\/\/[^\s")]+/);
              if (match) {
                url = match[0];
                break;
              }
            }
            if (nextLine.startsWith('###')) {
              break; // 下一个部分开始了，停止寻找URL
            }
          }
        }
        
        // 处理描述
        if (bodyLines[i].includes('### 描述') && i + 1 < bodyLines.length) {
          for (let j = i + 1; j < bodyLines.length; j++) {
            const nextLine = bodyLines[j].trim();
            if (nextLine && !nextLine.startsWith('###') && nextLine !== '_No response_'&& nextLine !== 'N/A') {
              description = nextLine;
              break;
            }
            if (nextLine.startsWith('###')) {
              break; // 下一个部分开始了，停止寻找描述
            }
          }
        }
        
        // 处理标签
        if (bodyLines[i].includes('### 标签') && i + 1 < bodyLines.length) {
          for (let j = i + 1; j < bodyLines.length; j++) {
            const nextLine = bodyLines[j].trim();
            if (nextLine && !nextLine.startsWith('###') && nextLine !== '_No response_'&& nextLine !== 'N/A') {
              tags = nextLine.split(',').map(tag => tag.trim());
              break;
            }
            if (nextLine.startsWith('###')) {
              break; // 下一个部分开始了，停止寻找标签
            }
          }
        }
      }
      
      return {
        id: issue.number,
        title,
        url,
        description,
        tags,
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