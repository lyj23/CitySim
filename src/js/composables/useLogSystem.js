/**
 * useLogSystem.js - 日志系统组合式函数
 * 提供日志显示和管理功能
 */

/**
 * 日志系统组合式函数
 * @param {Object} Vue - Vue 全局对象（用于解构 ref, nextTick）
 * @returns {Object} 日志相关的状态和方法
 */
function useLogSystem(Vue) {
    const { ref, nextTick } = Vue;
    // 日志消息数组
    const logMessages = ref([]);
    // 日志容器的 DOM 引用
    const logMessagesContainer = ref(null);
    
    /**
     * 添加日志消息
     * @param {string} message - 日志内容
     */
    function addLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        logMessages.value.push({ time: timestamp, text: message });
        // 仅保留最近100条日志
        if (logMessages.value.length > 100) {
            logMessages.value.shift();
        }
        // 自动滚动到底部
        nextTick(() => {
            if (logMessagesContainer.value) {
                logMessagesContainer.value.scrollTop = logMessagesContainer.value.scrollHeight;
            }
        });
    }
    
    /**
     * 清空所有日志
     */
    function clearLogs() {
        logMessages.value = [];
    }
    
    return {
        logMessages,
        logMessagesContainer,
        addLog,
        clearLogs
    };
}

// 导出为全局变量
window.useLogSystem = useLogSystem;
