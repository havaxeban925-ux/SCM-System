/**
 * styleService 单元测试
 * 
 * 测试款式管理服务的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase client
vi.mock('../lib/supabase', () => {
    const mockFrom = vi.fn();
    return {
        supabase: {
            from: mockFrom,
        },
        StyleDemand: {},
        PublicStyle: {},
    };
});

import { supabase } from '../lib/supabase';
import {
    getPrivateStyles,
    getPublicStyles,
    confirmStyle,
    abandonStyle,
    expressIntent,
} from '../services/styleService';

describe('styleService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================
    // getPrivateStyles 测试
    // ============================================
    describe('getPrivateStyles', () => {
        it('应该成功获取私推款式列表', async () => {
            const mockStyles = [
                { id: '1', name: '碎花连衣裙', status: 'new' },
                { id: '2', name: '真丝衬衫', status: 'locked' },
            ];

            const mockSelect = vi.fn().mockReturnThis();
            const mockIn = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: mockStyles, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ in: mockIn });
            mockIn.mockReturnValue({ order: mockOrder });

            const result = await getPrivateStyles();

            expect(supabase.from).toHaveBeenCalledWith('b_style_demand');
            expect(result).toEqual(mockStyles);
            expect(result.length).toBe(2);
        });

        it('当数据库错误时应该返回空数组', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockIn = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ in: mockIn });
            mockIn.mockReturnValue({ order: mockOrder });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await getPrivateStyles();

            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    // ============================================
    // getPublicStyles 测试
    // ============================================
    describe('getPublicStyles', () => {
        it('应该成功获取公池款式列表', async () => {
            const mockStyles = [
                { id: '1', name: '高腰牛仔裤', intent_count: 1, max_intents: 2 },
                { id: '2', name: '羊毛开衫', intent_count: 0, max_intents: 2 },
            ];

            const mockSelect = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: mockStyles, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ order: mockOrder });

            const result = await getPublicStyles();

            expect(supabase.from).toHaveBeenCalledWith('b_public_style');
            expect(result).toEqual(mockStyles);
        });

        it('当数据为空时应返回空数组', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ order: mockOrder });

            const result = await getPublicStyles();

            expect(result).toEqual([]);
        });
    });

    // ============================================
    // confirmStyle 测试
    // ============================================
    describe('confirmStyle', () => {
        it('应该成功确认接款', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockResolvedValue({ error: null });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
            } as any);
            mockUpdate.mockReturnValue({ eq: mockEq });

            const result = await confirmStyle('style-123');

            expect(supabase.from).toHaveBeenCalledWith('b_style_demand');
            expect(result).toBe(true);
        });

        it('当更新失败时应返回false', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockResolvedValue({
                error: { message: 'Update failed' }
            });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
            } as any);
            mockUpdate.mockReturnValue({ eq: mockEq });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await confirmStyle('style-123');

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('传入空ID时应该能处理', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockResolvedValue({ error: null });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
            } as any);
            mockUpdate.mockReturnValue({ eq: mockEq });

            const result = await confirmStyle('');
            expect(typeof result).toBe('boolean');
        });
    });

    // ============================================
    // abandonStyle 测试
    // ============================================
    describe('abandonStyle', () => {
        it('应该成功放弃接款', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockResolvedValue({ error: null });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
            } as any);
            mockUpdate.mockReturnValue({ eq: mockEq });

            const result = await abandonStyle('style-123');

            expect(result).toBe(true);
        });

        it('当操作失败时应返回false', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockResolvedValue({
                error: { message: 'Abandon failed' }
            });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
            } as any);
            mockUpdate.mockReturnValue({ eq: mockEq });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await abandonStyle('style-123');

            expect(result).toBe(false);
        });
    });

    // ============================================
    // expressIntent 测试
    // ============================================
    describe('expressIntent', () => {
        it('应该成功表达意向', async () => {
            // Mock 获取款式
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({
                data: { intent_count: 0, max_intents: 2 },
                error: null,
            });

            // Mock 更新
            const mockUpdate = vi.fn().mockReturnThis();
            const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

            let callCount = 0;
            vi.mocked(supabase.from).mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return {
                        select: mockSelect,
                    } as any;
                }
                return {
                    update: mockUpdate,
                } as any;
            });

            mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
            mockUpdate.mockReturnValue({ eq: mockUpdateEq });

            const result = await expressIntent('style-123');

            expect(result).toBe(true);
        });

        it('当意向已满时应返回false', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({
                data: { intent_count: 2, max_intents: 2 },
                error: null,
            });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const result = await expressIntent('style-123');

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Max intents reached for this style');
        });

        it('当款式不存在时应返回false', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
            });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await expressIntent('non-existent');

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
        });
    });
});
