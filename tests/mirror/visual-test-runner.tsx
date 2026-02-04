/**
 * SCM系统流程图可视化测试运行器
 * 
 * 提供图形化界面用于:
 * - 查看所有流程图测试用例
 * - 预览测试执行计划
 * - 确认后执行测试
 * - 显示测试结果和统计
 * 
 * 使用方法: 在浏览器中打开 dist/visual-test-runner.html
 */

import React, { useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import type { TestResult, TestCase, TestSuite, FlowchartTestCase } from './types';
import { testSuites, moduleConfigs } from './test-data';
import { 
    validateConfig, 
    generateExecutionPlan, 
    executeTest,
    exportResults 
} from './test-engine';
import './visual-test-runner.css';

interface VisualConfig {
    supabaseUrl: string;
    supabaseKey: string;
    apiUrl: string;
    adminEmail: string;
    adminPassword: string;
    testMode: boolean;
    autoCleanup: boolean;
    timeout: number;
}

const defaultConfig: VisualConfig = {
    supabaseUrl: '',
    supabaseKey: '',
    apiUrl: 'http://localhost:3001/api',
    adminEmail: '',
    adminPassword: '',
    testMode: true,
    autoCleanup: true,
    timeout: 30000
};

interface ExecutionState {
    isRunning: boolean;
    currentTest: string;
    progress: number;
    results: Map<string, TestResult>;
    logs: string[];
    startTime: number | null;
    endTime: number | null;
}

const initialExecutionState: ExecutionState = {
    isRunning: false,
    currentTest: '',
    progress: 0,
    results: new Map(),
    logs: [],
    startTime: null,
    endTime: null
};

function App() {
    const [config, setConfig] = useState<VisualConfig>(() => {
        const saved = localStorage.getItem('scm_visual_test_config');
        return saved ? JSON.parse(saved) : defaultConfig;
    });
    
    const [executionState, setExecutionState] = useState<ExecutionState>(initialExecutionState);
    const [selectedSuites, setSelectedSuites] = useState<Set<string>>(new Set(
        testSuites.map(suite => suite.flowchartId)
    ));
    const [previewData, setPreviewData] = useState<{
        totalTests: number;
        estimatedTime: number;
        testList: { suite: string; test: FlowchartTestCase }[];
    } | null>(null);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [configErrors, setConfigErrors] = useState<string[]>([]);
    const [userConfirmed, setUserConfirmed] = useState(false);

    const saveConfig = useCallback((newConfig: VisualConfig) => {
        setConfig(newConfig);
        localStorage.setItem('scm_visual_test_config', JSON.stringify(newConfig));
        setConfigErrors([]);
    }, []);

    const handleSuiteToggle = useCallback((suiteId: string) => {
        setSelectedSuites(prev => {
            const next = new Set(prev);
            if (next.has(suiteId)) {
                next.delete(suiteId);
            } else {
                next.add(suiteId);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        setSelectedSuites(new Set(testSuites.map(suite => suite.flowchartId)));
    }, []);

    const handleDeselectAll = useCallback(() => {
        setSelectedSuites(new Set());
    }, []);

    const handleShowPreview = useCallback(() => {
        const validationErrors = validateConfig(config);
        if (validationErrors.length > 0) {
            setConfigErrors(validationErrors);
            setShowConfigModal(true);
            return;
        }

        const plan = generateExecutionPlan(testSuites, selectedSuites);
        setPreviewData(plan);
        setShowPreviewModal(true);
    }, [config, selectedSuites]);

    const handleConfirmAndExecute = useCallback(async () => {
        if (!userConfirmed) {
            setUserConfirmed(true);
            setShowPreviewModal(false);
        }
        
        setExecutionState(prev => ({
            ...prev,
            isRunning: true,
            startTime: Date.now(),
            results: new Map(),
            logs: []
        }));

        const results = new Map<string, TestResult>();
        const logs: string[] = [];
        let completed = 0;
        const totalTests = previewData?.totalTests || 0;

        const allTests = previewData?.testList || [];

        for (const { suite, test } of allTests) {
            const logEntry = `[${new Date().toLocaleTimeString()}] 开始执行: ${test.module} - ${test.testName}`;
            logs.push(logEntry);
            
            setExecutionState(prev => ({
                ...prev,
                currentTest: `${test.module} / ${test.testName}`,
                progress: Math.round((completed / totalTests) * 100),
                logs: [...logs]
            }));

            try {
                const result = await executeTest(test, config);
                results.set(test.testName, result);
                
                if (result.passed) {
                    logs.push(`✅ 通过 - 耗时: ${result.duration}ms`);
                } else {
                    logs.push(`❌ 失败 - ${result.error || '未知错误'}`);
                }
            } catch (error: any) {
                const result: TestResult = {
                    testName: test.testName,
                    module: test.module,
                    passed: false,
                    error: error.message,
                    duration: 0
                };
                results.set(test.testName, result);
                logs.push(`💥 异常 - ${error.message}`);
            }

            completed++;
            setExecutionState(prev => ({
                ...prev,
                progress: Math.round((completed / totalTests) * 100),
                results: new Map(results),
                logs: [...logs]
            }));

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        setExecutionState(prev => ({
            ...prev,
            isRunning: false,
            endTime: Date.now(),
            progress: 100
        }));

        exportResults(results, 'scm-flowchart-test-results');
    }, [config, previewData, userConfirmed]);

    const stats = useMemo(() => {
        const results = Array.from(executionState.results.values());
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
        
        return { passed, failed, total: results.length, totalDuration };
    }, [executionState.results]);

    return (
        <div className="visual-test-runner">
            <header className="header">
                <h1>🧪 SCM系统流程图可视化测试运行器</h1>
                <p className="subtitle">基于流程图文档的完整测试覆盖 - {testSuites.length}个流程图 · 86个测试用例</p>
            </header>

            <div className="main-content">
                <aside className="sidebar">
                    <div className="config-section">
                        <h3>⚙️ 配置信息</h3>
                        <button 
                            className="btn btn-secondary"
                            onClick={() => setShowConfigModal(true)}
                        >
                            查看/修改配置
                        </button>
                        {configErrors.length > 0 && (
                            <div className="config-errors">
                                <span className="error-badge">{configErrors.length}个配置问题</span>
                            </div>
                        )}
                    </div>

                    <div className="stats-section">
                        <h3>📊 测试统计</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-value">{testSuites.length}</span>
                                <span className="stat-label">流程图</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">
                                    {testSuites.reduce((sum, s) => sum + s.testCases.length, 0)}
                                </span>
                                <span className="stat-label">测试用例</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{selectedSuites.size}</span>
                                <span className="stat-label">已选择</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{stats.passed + stats.failed}</span>
                                <span className="stat-label">已执行</span>
                            </div>
                        </div>
                    </div>

                    <div className="selection-section">
                        <h3>📋 选择流程图</h3>
                        <div className="selection-actions">
                            <button className="btn btn-small" onClick={handleSelectAll}>全选</button>
                            <button className="btn btn-small" onClick={handleDeselectAll}>全不选</button>
                        </div>
                        <div className="suite-list">
                            {testSuites.map(suite => (
                                <label key={suite.flowchartId} className="suite-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedSuites.has(suite.flowchartId)}
                                        onChange={() => handleSuiteToggle(suite.flowchartId)}
                                    />
                                    <span className="suite-name">{suite.flowchartName}</span>
                                    <span className="test-count">{suite.testCases.length}个测试</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="action-section">
                        <button 
                            className="btn btn-primary btn-large"
                            onClick={handleShowPreview}
                            disabled={selectedSuites.size === 0 || executionState.isRunning}
                        >
                            👁️ 预览并确认执行
                        </button>
                    </div>
                </aside>

                <main className="content">
                    {executionState.startTime === null ? (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <h2>选择测试流程图并开始</h2>
                            <p>左侧选择要执行的测试流程图，点击"预览并确认执行"按钮开始</p>
                            <div className="feature-list">
                                <div className="feature-item">✅ 完整的测试用例覆盖</div>
                                <div className="feature-item">✅ 执行前预览确认</div>
                                <div className="feature-item">✅ 实时进度显示</div>
                                <div className="feature-item">✅ 结果统计与导出</div>
                            </div>
                        </div>
                    ) : (
                        <div className="results-view">
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${executionState.progress}%` }}
                                />
                                <span className="progress-text">
                                    {executionState.progress}% ({stats.passed + stats.failed}/{previewData?.totalTests || 0})
                                </span>
                            </div>

                            {executionState.isRunning && (
                                <div className="current-test">
                                    <span className="pulse">🔄</span>
                                    正在执行: {executionState.currentTest}
                                </div>
                            )}

                            <div className="results-grid">
                                <div className="results-summary">
                                    <div className="summary-card passed">
                                        <span className="summary-value">{stats.passed}</span>
                                        <span className="summary-label">通过</span>
                                    </div>
                                    <div className="summary-card failed">
                                        <span className="summary-value">{stats.failed}</span>
                                        <span className="summary-label">失败</span>
                                    </div>
                                    <div className="summary-card total">
                                        <span className="summary-value">{stats.total}</span>
                                        <span className="summary-label">总计</span>
                                    </div>
                                    <div className="summary-card duration">
                                        <span className="summary-value">
                                            {Math.round(stats.totalDuration / 1000)}s
                                        </span>
                                        <span className="summary-label">耗时</span>
                                    </div>
                                </div>

                                <div className="logs-panel">
                                    <h4>📜 执行日志</h4>
                                    <div className="logs-container">
                                        {executionState.logs.map((log, index) => (
                                            <div key={index} className="log-entry">
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="results-list">
                                    <h4>📝 测试结果详情</h4>
                                    {Array.from(executionState.results.entries()).map(([name, result]) => (
                                        <div 
                                            key={name} 
                                            className={`result-item ${result.passed ? 'passed' : 'failed'}`}
                                        >
                                            <span className="result-icon">
                                                {result.passed ? '✅' : '❌'}
                                            </span>
                                            <span className="result-name">{name}</span>
                                            <span className="result-duration">{result.duration}ms</span>
                                            {result.error && (
                                                <span className="result-error">{result.error}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {executionState.endTime !== null && (
                                <div className="execution-complete">
                                    <h3>🎉 测试执行完成</h3>
                                    <p>开始时间: {new Date(executionState.startTime).toLocaleString()}</p>
                                    <p>结束时间: {new Date(executionState.endTime).toLocaleString()}</p>
                                    <button 
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setExecutionState(initialExecutionState);
                                            setUserConfirmed(false);
                                            setPreviewData(null);
                                        }}
                                    >
                                        🔄 重新开始
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {showConfigModal && (
                <ConfigModal 
                    config={config}
                    onSave={saveConfig}
                    onClose={() => {
                        setShowConfigModal(false);
                        setConfigErrors([]);
                    }}
                />
            )}

            {showPreviewModal && previewData && (
                <PreviewModal
                    previewData={previewData}
                    config={config}
                    onConfirm={handleConfirmAndExecute}
                    onCancel={() => {
                        setShowPreviewModal(false);
                        setUserConfirmed(false);
                    }}
                />
            )}
        </div>
    );
}

function ConfigModal({ 
    config, 
    onSave, 
    onClose 
}: { 
    config: VisualConfig; 
    onSave: (c: VisualConfig) => void;
    onClose: () => void;
}) {
    const [localConfig, setLocalConfig] = useState(config);
    const [errors, setErrors] = useState<string[]>([]);

    const handleSave = () => {
        const validationErrors: string[] = [];
        
        if (!localConfig.supabaseUrl) {
            validationErrors.push('Supabase URL 不能为空');
        }
        if (!localConfig.supabaseUrl.includes('supabase.co')) {
            validationErrors.push('Supabase URL 格式不正确');
        }
        if (!localConfig.supabaseKey) {
            validationErrors.push('Supabase Key 不能为空');
        }
        if (!localConfig.apiUrl) {
            validationErrors.push('API URL 不能为空');
        }
        
        setErrors(validationErrors);
        
        if (validationErrors.length === 0) {
            onSave(localConfig);
            onClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>⚙️ 测试配置</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <div className="config-groups">
                        <div className="config-group">
                            <h4>🔐 Supabase 配置</h4>
                            <p className="config-hint">请在 .env.local 文件中获取以下配置信息</p>
                            
                            <div className="form-field">
                                <label>Supabase URL *</label>
                                <input
                                    type="url"
                                    value={localConfig.supabaseUrl}
                                    onChange={e => setLocalConfig({ ...localConfig, supabaseUrl: e.target.value })}
                                    placeholder="https://xxxxx.supabase.co"
                                />
                            </div>
                            
                            <div className="form-field">
                                <label>Supabase Service Role Key *</label>
                                <input
                                    type="password"
                                    value={localConfig.supabaseKey}
                                    onChange={e => setLocalConfig({ ...localConfig, supabaseKey: e.target.value })}
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                />
                                <span className="field-hint">需要 service_role 权限的密钥</span>
                            </div>
                        </div>

                        <div className="config-group">
                            <h4>🌐 API 配置</h4>
                            
                            <div className="form-field">
                                <label>API Base URL</label>
                                <input
                                    type="url"
                                    value={localConfig.apiUrl}
                                    onChange={e => setLocalConfig({ ...localConfig, apiUrl: e.target.value })}
                                    placeholder="http://localhost:3001/api"
                                />
                            </div>
                        </div>

                        <div className="config-group">
                            <h4>👤 测试账号 (可选)</h4>
                            
                            <div className="form-field">
                                <label>管理员邮箱</label>
                                <input
                                    type="email"
                                    value={localConfig.adminEmail}
                                    onChange={e => setLocalConfig({ ...localConfig, adminEmail: e.target.value })}
                                    placeholder="admin@example.com"
                                />
                            </div>
                            
                            <div className="form-field">
                                <label>管理员密码</label>
                                <input
                                    type="password"
                                    value={localConfig.adminPassword}
                                    onChange={e => setLocalConfig({ ...localConfig, adminPassword: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="config-group">
                            <h4>⚡ 执行选项</h4>
                            
                            <div className="checkbox-field">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={localConfig.testMode}
                                        onChange={e => setLocalConfig({ ...localConfig, testMode: e.target.checked })}
                                    />
                                    测试模式 (不实际修改数据)
                                </label>
                            </div>
                            
                            <div className="checkbox-field">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={localConfig.autoCleanup}
                                        onChange={e => setLocalConfig({ ...localConfig, autoCleanup: e.target.checked })}
                                    />
                                    自动清理测试数据
                                </label>
                            </div>
                            
                            <div className="form-field">
                                <label>超时时间 (毫秒)</label>
                                <input
                                    type="number"
                                    value={localConfig.timeout}
                                    onChange={e => setLocalConfig({ ...localConfig, timeout: parseInt(e.target.value) })}
                                    min={5000}
                                    max={120000}
                                />
                            </div>
                        </div>
                    </div>

                    {errors.length > 0 && (
                        <div className="error-list">
                            <h4>❌ 配置验证失败</h4>
                            <ul>
                                {errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>取消</button>
                    <button className="btn btn-primary" onClick={handleSave}>保存配置</button>
                </div>
            </div>
        </div>
    );
}

function PreviewModal({
    previewData,
    config,
    onConfirm,
    onCancel
}: {
    previewData: {
        totalTests: number;
        estimatedTime: number;
        testList: { suite: string; test: FlowchartTestCase }[];
    };
    config: VisualConfig;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [confirmed, setConfirmed] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    const groupedTests = useMemo(() => {
        const groups: Record<string, FlowchartTestCase[]> = {};
        for (const { suite, test } of previewData.testList) {
            if (!groups[suite]) groups[suite] = [];
            groups[suite].push(test);
        }
        return groups;
    }, [previewData]);

    return (
        <div className="modal-overlay preview-modal">
            <div className="modal modal-large">
                <div className="modal-header">
                    <h2>👁️ 执行预览确认</h2>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>
                
                <div className="modal-body">
                    <div className="preview-summary">
                        <div className="preview-stat">
                            <span className="value">{previewData.totalTests}</span>
                            <span className="label">测试用例</span>
                        </div>
                        <div className="preview-stat">
                            <span className="value">{Object.keys(groupedTests).length}</span>
                            <span className="label">流程图</span>
                        </div>
                        <div className="preview-stat">
                            <span class="value">{Math.ceil(previewData.estimatedTime / 1000)}s</span>
                            <span class="label">预计时间</span>
                        </div>
                    </div>

                    <div className="config-warning">
                        <h4>📋 将要执行的配置</h4>
                        <div className="warning-content">
                            <div className="warning-item">
                                <span className="label">Supabase:</span>
                                <span className="value">{config.supabaseUrl || '❌ 未配置'}</span>
                            </div>
                            <div className="warning-item">
                                <span className="label">API:</span>
                                <span className="value">{config.apiUrl}</span>
                            </div>
                            <div className="warning-item">
                                <span className="label">测试模式:</span>
                                <span className="value">{config.testMode ? '是' : '否'}</span>
                            </div>
                            <div className="warning-item">
                                <span className="label">自动清理:</span>
                                <span className="value">{config.autoCleanup ? '是' : '否'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="test-preview-list">
                        <h4>📝 测试用例列表</h4>
                        {Object.entries(groupedTests).map(([suiteName, tests]) => (
                            <div key={suiteName} className="preview-group">
                                <div className="preview-group-header">
                                    <span className="suite-name">{suiteName}</span>
                                    <span className="count">{tests.length}个测试</span>
                                </div>
                                <div className="preview-group-tests">
                                    {tests.map((test, index) => (
                                        <div key={index} className="preview-test-item">
                                            <span className="test-method">{test.method}</span>
                                            <span className="test-endpoint">{test.apiEndpoint}</span>
                                            <span className="test-name">{test.testName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="confirmation-section">
                        <label className="confirm-checkbox">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={e => {
                                    setConfirmed(e.target.checked);
                                    setShowWarning(!e.target.checked);
                                }}
                            />
                            <span className="confirm-text">
                                我已确认了解将要执行的测试内容，并准备好开始执行
                            </span>
                        </label>
                        
                        {showWarning && (
                            <div className="warning-message">
                                ⚠️ 请勾选上方确认框以继续
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>取消</button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => {
                            if (confirmed) onConfirm();
                        }}
                        disabled={!confirmed}
                    >
                        🚀 开始执行测试
                    </button>
                </div>
            </div>
        </div>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

export { App, ConfigModal, PreviewModal };
