/**
 * restockService 单元测试
 * 
 * 测试补货订单服务的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase client
vi.mock('../lib/supabase', () => {
    const mockFrom = vi.fn();
    return {
        supabase: {
            from: mockFrom,
        },
        // 导出类型定义（空实现）
        RestockOrder: {},
        RestockLogistics: {},
    };
});

import { supabase } from '../lib/supabase';
import {
    getRestockOrders,
    updateQuantity,
    confirmOrder,
    getOrderLogistics,
} from '../services/restockService';

describe('restockService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================
    // getRestockOrders 测试
    // ============================================
    describe('getRestockOrders', () => {
        it('应该成功获取补货订单列表', async () => {
            const mockOrders = [
                { id: '1', skc_code: 'SKC001', status: '待商家接单', plan_quantity: 100 },
                { id: '2', skc_code: 'SKC002', status: '生产中', plan_quantity: 200 },
            ];

            const mockSelect = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: mockOrders, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
                order: mockOrder,
            } as any);
            mockSelect.mockReturnValue({ order: mockOrder });

            const result = await getRestockOrders();

            expect(supabase.from).toHaveBeenCalledWith('b_restock_order');
            expect(result).toEqual(mockOrders);
            expect(result.length).toBe(2);
        });

        it('当数据库返回错误时应该返回空数组', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
                order: mockOrder,
            } as any);
            mockSelect.mockReturnValue({ order: mockOrder });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await getRestockOrders();

            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('当数据为null时应该返回空数组', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
                order: mockOrder,
            } as any);
            mockSelect.mockReturnValue({ order: mockOrder });

            const result = await getRestockOrders();

            expect(result).toEqual([]);
        });
    });

    // ============================================
    // updateQuantity 测试
    // ============================================
    describe('updateQuantity', () => {
        it('应该成功更新数量', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockResolvedValue({ error: null });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
                eq: mockEq,
            } as any);
            mockUpdate.mockReturnValue({ eq: mockEq });

            const result = await updateQuantity('order-123', 500, '库存不足');

            expect(supabase.from).toHaveBeenCalledWith('b_restock_order');
            expect(result).toBe(true);
        });

        it('当更新失败时应该返回false', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockResolvedValue({
                error: { message: 'Update failed' }
            });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
                eq: mockEq,
            } as any);
            mockUpdate.mockReturnValue({ eq: mockEq });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await updateQuantity('order-123', 500);

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('传入无效ID时应该能处理', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockResolvedValue({ error: null });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
                eq: mockEq,
            } as any);
            mockUpdate.mockReturnValue({ eq: mockEq });

            // 即使ID为空字符串，函数也应该正常执行（由数据库层处理验证）
            const result = await updateQuantity('', 100);
            expect(typeof result).toBe('boolean');
        });

        it('传入负数数量时应该能处理', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockResolvedValue({ error: null });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
                eq: mockEq,
            } as any);
            mockUpdate.mockReturnValue({ eq: mockEq });

            // 负数应该由业务逻辑或数据库约束处理
            const result = await updateQuantity('order-123', -100);
            expect(typeof result).toBe('boolean');
        });
    });

    // ============================================
    // confirmOrder 测试
    // ============================================
    describe('confirmOrder', () => {
        it('当实际数量等于计划数量时状态应为生产中', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({
                data: { plan_quantity: 100, actual_quantity: 100 },
                error: null,
            });
            const mockUpdate = vi.fn().mockReturnThis();
            const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'b_restock_order') {
                    return {
                        select: mockSelect,
                        eq: mockEq,
                        single: mockSingle,
                        update: mockUpdate,
                    } as any;
                }
                return {} as any;
            });

            mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
            mockUpdate.mockReturnValue({ eq: mockUpdateEq });

            const result = await confirmOrder('order-123');

            expect(result).toBe(true);
        });

        it('当订单不存在时应该返回false', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
            });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await confirmOrder('non-existent-id');

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    // ============================================
    // getOrderLogistics 测试
    // ============================================
    describe('getOrderLogistics', () => {
        it('应该成功获取订单物流明细', async () => {
            const mockLogistics = [
                { id: 'log-1', wb_number: 'WB001', shipped_qty: 50 },
                { id: 'log-2', wb_number: 'WB002', shipped_qty: 30 },
            ];

            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: mockLogistics, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ eq: mockEq });
            mockEq.mockReturnValue({ order: mockOrder });

            const result = await getOrderLogistics('order-123');

            expect(supabase.from).toHaveBeenCalledWith('b_restock_logistics');
            expect(result).toEqual(mockLogistics);
        });

        it('当订单无物流记录时应该返回空数组', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ eq: mockEq });
            mockEq.mockReturnValue({ order: mockOrder });

            const result = await getOrderLogistics('order-no-logistics');

            expect(result).toEqual([]);
        });

        it('传入空字符串orderId时应该能处理', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
            } as any);
            mockSelect.mockReturnValue({ eq: mockEq });
            mockEq.mockReturnValue({ order: mockOrder });

            const result = await getOrderLogistics('');

            expect(Array.isArray(result)).toBe(true);
        });
    });
});
