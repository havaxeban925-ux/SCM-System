import React from 'react';

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">女装供应链协同系统 - 商家端</h1>
                <p className="text-lg text-gray-600 mb-8">商家功能开发中...</p>
                <div className="space-y-4">
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-2">发起申请</h2>
                        <p className="text-gray-500">提交新款式开发申请</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-2">开发进度</h2>
                        <p className="text-gray-500">查看款式开发状态</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
