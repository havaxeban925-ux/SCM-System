/**
 * 镜像测试工具类
 * 提供API请求、数据清理、报告生成等功能
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_PREFIX = 'MIRROR_TEST_';

// Supabase 客户端
const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

export interface TestResult {
    module: string;
    testName: string;
    passed: boolean;
    error?: string;
    duration: number;
}

export interface TestReport {
    timestamp: string;
    totalTests: number;
    passed: number;
    failed: number;
    results: TestResult[];
    issues: Issue[];
}

export interface Issue {
    severity: 'critical' | 'major' | 'minor';
    module: string;
    description: string;
    suggestion?: string;
}

// HTTP 请求辅助函数
export async function post(url: string, body: any): Promise<{ status: number; data: any }> {
    try {
        const res = await fetch(`${API_URL}${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
    } catch (e: any) {
        return { status: 0, data: { error: e.message } };
    }
}

export async function get(url: string): Promise<{ status: number; data: any }> {
    try {
        const res = await fetch(`${API_URL}${url}`);
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
    } catch (e: any) {
        return { status: 0, data: { error: e.message } };
    }
}

export async function patch(url: string, body: any): Promise<{ status: number; data: any }> {
    try {
        const res = await fetch(`${API_URL}${url}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
    } catch (e: any) {
        return { status: 0, data: { error: e.message } };
    }
}

export async function del(url: string): Promise<{ status: number; data: any }> {
    try {
        const res = await fetch(`${API_URL}${url}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
    } catch (e: any) {
        return { status: 0, data: { error: e.message } };
    }
}

// 测试运行器
export async function runTest(
    module: string,
    testName: string,
    testFn: () => Promise<void>
): Promise<TestResult> {
    const start = Date.now();
    try {
        await testFn();
        return {
            module,
            testName,
            passed: true,
            duration: Date.now() - start
        };
    } catch (e: any) {
        return {
            module,
            testName,
            passed: false,
            error: e.message,
            duration: Date.now() - start
        };
    }
}

// 断言函数
export function assertEqual(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

export function assertTrue(condition: boolean, message?: string) {
    if (!condition) {
        throw new Error(message || 'Assertion failed: expected true');
    }
}

export function assertExists(value: any, message?: string) {
    if (value === null || value === undefined) {
        throw new Error(message || 'Assertion failed: value is null or undefined');
    }
}

// 数据清理
export async function cleanupTestData() {
    const tables = ['sys_user', 'sys_shop', 'b_public_style', 'b_style_demand', 'b_request_record', 'b_restock_order'];

    for (const table of tables) {
        await supabaseAdmin
            .from(table)
            .delete()
            .like(table === 'sys_user' ? 'username' : 'name', `${TEST_PREFIX}%`);
    }

    // 特殊处理：根据shop_name清理
    await supabaseAdmin.from('b_request_record').delete().like('shop_name', `${TEST_PREFIX}%`);
    await supabaseAdmin.from('b_restock_order').delete().like('skc_code', `${TEST_PREFIX}%`);
}

// 测试数据生成
export function genTestId(): string {
    return `${TEST_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export { supabaseAdmin, TEST_PREFIX };
