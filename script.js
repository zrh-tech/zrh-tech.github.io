const GITHUB_CONFIG = {
    username: 'zrh-tech',  // 例如: 'binggua'
    repo: 'zrh-tech.github.io',           // 例如: 'my-website'
    contentPath: 'content.json',  // 内容JSON文件的路径
    contentDir: 'content',        // 存放媒体文件的目录
    branch: 'main'                // 默认分支
};

// ==================== 全局变量 ====================
let contentData = [];
let isLoading = false;

// ==================== DOM元素 ====================
const contentContainer = document.getElementById('contentContainer');
const contentCount = document.getElementById('contentCount');
const visitorCount = document.getElementById('visitorCount');
const lastUpdate = document.getElementById('lastUpdate');
const refreshBtn = document.getElementById('refreshBtn');
const addContentBtn = document.getElementById('addContentBtn');
const addContentModal = document.getElementById('addContentModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const contentForm = document.getElementById('contentForm');
const contentType = document.getElementById('contentType');
const urlInputGroup = document.getElementById('urlInputGroup');

// ==================== 初始化函数 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 设置当前日期为默认值
    document.getElementById('contentDate').valueAsDate = new Date();
    
    // 启动计数器动画
    animateCounter();
    
    // 加载内容
    loadContent();
    
    // 绑定事件
    bindEvents();
});

// ==================== 事件绑定 ====================
function bindEvents() {
    // 刷新内容
    refreshBtn.addEventListener('click', loadContent);
    
    // 打开添加内容模态框
    addContentBtn.addEventListener('click', () => {
        addContentModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // 关闭模态框
    closeModal.addEventListener('click', closeModalHandler);
    cancelBtn.addEventListener('click', closeModalHandler);
    
    // 点击模态框背景关闭
    addContentModal.addEventListener('click', (e) => {
        if (e.target === addContentModal) {
            closeModalHandler();
        }
    });
    
    // 内容类型变化
    contentType.addEventListener('change', () => {
        if (contentType.value === 'text') {
            urlInputGroup.style.display = 'none';
        } else {
            urlInputGroup.style.display = 'block';
        }
    });
    
    // 表单提交
    contentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        addNewContent();
    });
}

// ==================== 计数器动画 ====================
function animateCounter() {
    let count = 0;
    const target = 999;
    const duration = 2000;
    const steps = 50;
    const increment = target / steps;
    const interval = duration / steps;
    
    const timer = setInterval(() => {
        count += increment;
        if (count >= target) {
            count = target;
            clearInterval(timer);
        }
        visitorCount.textContent = Math.round(count) + '+';
    }, interval);
}

// ==================== GitHub API 功能 ====================
// 从GitHub获取内容
async function fetchContentFromGitHub() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        // 构建API URL
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.contentPath}`;
        
        // 设置请求头
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        // 如果有token，添加到请求头
        // if (GITHUB_TOKEN) {
        //     headers['Authorization'] = `token ${GITHUB_TOKEN}`;
        // }
        
        // 发送请求
        const response = await fetch(apiUrl, { headers });
        
        if (!response.ok) {
            throw new Error(`GitHub API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 解码Base64内容
        const content = atob(data.content.replace(/\s/g, ''));
        return JSON.parse(content);
    } catch (error) {
        console.error('从GitHub获取内容失败:', error);
        showError('从GitHub获取内容失败: ' + error.message);
        // 返回空内容
        return { items: [], lastUpdated: new Date().toISOString() };
    } finally {
        isLoading = false;
    }
}

// ==================== 内容管理功能 ====================
// 加载内容
async function loadContent() {
    if (isLoading) return;
    
    contentContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 从GitHub加载内容...</div>';
    
    try {
        const contentData = await fetchContentFromGitHub();
        contentData.items = contentData.items || [];
        
        renderContent(contentData.items);
        updateLastUpdate(contentData.lastUpdated);
    } catch (error) {
        console.error('加载内容失败:', error);
        showError('加载内容失败: ' + error.message);
    }
}

// 渲染内容
function renderContent(items) {
    if (!items || items.length === 0) {
        contentContainer.innerHTML = `
            <div class="no-content" style="text-align: center; padding: 40px; color: #888; grid-column: 1 / -1;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <h3>暂无内容</h3>
                <p>内容将显示在这里</p>
            </div>
        `;
        contentCount.textContent = "0";
        return;
    }
    
    contentContainer.innerHTML = '';
    items.forEach(item => {
        let mediaElement = '';
        
        if (item.type === 'image') {
            mediaElement = `<img src="${item.url}" alt="${item.title}" class="content-media" loading="lazy">`;
        } else if (item.type === 'video') {
            // 处理不同的视频URL格式
            if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
                // YouTube视频
                const videoId = item.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                if (videoId) {
                    mediaElement = `
                        <iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId[1]}" 
                                frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen class="content-media"></iframe>
                    `;
                } else {
                    mediaElement = `<div class="content-media" style="display: flex; align-items: center; justify-content: center; background: #f5f7fa;">
                        <p>无法加载视频: ${item.url}</p>
                    </div>`;
                }
            } else if (item.url.includes('vimeo.com')) {
                // Vimeo视频
                const videoId = item.url.match(/(?:vimeo\.com\/)([0-9]+)/);
                if (videoId) {
                    mediaElement = `
                        <iframe src="https://player.vimeo.com/video/${videoId[1]}" width="100%" height="200" 
                                frameborder="0" allow="autoplay; fullscreen; picture-in-picture" 
                                allowfullscreen class="content-media"></iframe>
                    `;
                } else {
                    mediaElement = `<div class="content-media" style="display: flex; align-items: center; justify-content: center; background: #f5f7fa;">
                        <p>无法加载视频: ${item.url}</p>
                    </div>`;
                }
            } else {
                // 普通视频
                mediaElement = `
                    <video controls width="100%" height="200" class="content-media">
                        <source src="${item.url}" type="video/mp4">
                        您的浏览器不支持视频播放
                    </video>
                `;
            }
        } else {
            // 文本内容
            mediaElement = `
                <div class="content-media" style="display: flex; align-items: center; justify-content: center; background: #f5f7fa;">
                    <i class="fas fa-file-alt" style="font-size: 3rem; color: #2c92e5;"></i>
                </div>
            `;
        }
        
        const contentElement = document.createElement('div');
        contentElement.className = 'content-item';
        contentElement.innerHTML = `
            ${mediaElement}
            <div class="content-info">
                <h3 class="content-title">${item.title}</h3>
                <p class="content-description">${item.description}</p>
                <p class="content-date">${formatDate(item.date)}</p>
            </div>
        `;
        
        contentContainer.appendChild(contentElement);
    });
    
    contentCount.textContent = items.length;
}

// 添加新内容
function addNewContent() {
    const title = document.getElementById('contentTitle').value;
    const description = document.getElementById('contentDescription').value;
    const type = document.getElementById('contentType').value;
    const url = type === 'text' ? '' : document.getElementById('contentUrl').value;
    const date = document.getElementById('contentDate').value;
    
    const newContent = {
        id: Date.now(),
        title,
        description,
        type,
        url,
        date
    };
    
    // 在实际使用中，这里应该将内容保存到GitHub
    // 由于GitHub API的限制，这通常需要后端服务或GitHub Action
    // 这里我们只是模拟添加内容
    contentData.unshift(newContent);
    
    // 重新渲染内容
    renderContent(contentData);
    updateLastUpdate();
    
    // 关闭模态框
    closeModalHandler();
    
    // 显示提示信息
    alert('内容已添加！在实际部署中，这将通过GitHub Action自动更新到GitHub。\n\n要实际使用此功能，您需要设置GitHub Action工作流。');
}

// ==================== 工具函数 ====================
// 关闭模态框处理函数
function closeModalHandler() {
    addContentModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    contentForm.reset();
    // 重置内容类型显示
    urlInputGroup.style.display = 'block';
}

// 更新最后更新时间
function updateLastUpdate(timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    lastUpdate.textContent = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 显示错误信息
function showError(message) {
    contentContainer.innerHTML = `
        <div class="error" style="text-align: center; padding: 40px; color: #ff3b30; grid-column: 1 / -1;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
            <h3>加载内容失败</h3>
            <p>${message}</p>
            <button class="btn" onclick="loadContent()">
                <i class="fas fa-sync-alt"></i> 重试
            </button>
        </div>
    `;
}

