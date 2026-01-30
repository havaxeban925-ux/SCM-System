
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Error caught by ${this.props.name || 'ErrorBoundary'}:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center">
                    <span className="material-symbols-outlined text-red-400 text-4xl mb-3">error</span>
                    <h2 className="text-red-700 font-bold mb-2">组件加载出错</h2>
                    <p className="text-red-500 text-sm mb-4">该模块暂时不可用，请尝试刷新页面或联系管理员。</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                    >
                        重试
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
