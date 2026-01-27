import React, { useState, useEffect, useMemo } from 'react';
import { createQuoteRequest, createSamePriceRequest, createPriceIncreaseRequest, createAnomalyRequest } from '../services/requestService';

// --- 类型定义 ---
interface FabricItem { id: number; name: string; width: string; weight: string; price: string; usage: string; loss: string; }
interface AccessoryItem { id: number; name: string; price: string; remark: string; }
interface YarnItem { id: number; name: string; weight: string; loss: string; price: string; }

interface Props {
  onClose: () => void;
}

// ============================================================================
// UI 组件库
// ============================================================================

const SectionBox = ({ title, action, children, className = "" }: any) => (
  <div className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4 ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
        {title && <h3 className="font-bold text-slate-700 text-sm border-l-4 border-blue-600 pl-2">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </div>
);

const VisibleInput = ({ value, onChange, type = "text", align = "left", placeholder = "0", className = "" }: any) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full text-[12px] h-8 px-2 outline-none transition-all rounded border border-slate-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-slate-700 font-medium placeholder:text-slate-300 text-${align} ${className}`}
  />
);

const TableInput = ({ value, onChange, type = "text", align = "center", placeholder = "0", highlight = false }: any) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full text-[12px] py-1 px-1 outline-none transition-all rounded border 
      ${highlight ? 'border-slate-300 bg-white ring-1 ring-slate-100 font-bold' : 'border-slate-200 bg-white'} 
      focus:border-blue-500 text-slate-700 text-${align}`}
  />
);

// 图片上传格子 (5格均可上传)
const InputImageGrid = () => (
  <div className="grid grid-cols-5 gap-3">
    {['款式主图*', '唛架图1', '色卡图1', '唛架图2', '色卡图2'].map((label, i) => (
      <div key={i} className={`aspect-square border-2 border-dashed ${i === 0 ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'} hover:bg-blue-50 hover:border-blue-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all group`}>
        <span className="material-symbols-outlined text-2xl text-slate-300 group-hover:text-blue-500 mb-1">{i === 0 ? 'checkroom' : 'image'}</span>
        <span className="font-bold text-[9px] text-slate-600 text-center">{label}</span>
        {i === 0 && <span className="text-[8px] text-red-400 mt-0.5">必须</span>}
      </div>
    ))}
  </div>
);

// 利润控制组件 (新需求: 布局调整)
const ProfitControl = ({ label, actualProfit, setActualProfit, rate, setRate, calculatedProfit }: any) => (
  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mt-2">
    {/* 第一行：实际利润 */}
    <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
      <span className="font-bold text-slate-700 text-sm">实际利润</span>
      <div className="w-32">
        <VisibleInput align="right" className="font-bold text-amber-600 text-sm" value={actualProfit} onChange={(e: any) => setActualProfit(e.target.value)} />
      </div>
    </div>

    {/* 第二行：建议利润计算与应用 */}
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 shrink-0">建议利润</span>
      {/* 百分比大框 */}
      <div className="flex items-center bg-white border border-slate-300 rounded px-1 h-8 w-20">
        <input
          className="w-full text-center font-bold text-slate-700 text-sm outline-none"
          value={rate}
          onChange={e => setRate(e.target.value)}
        />
        <span className="text-xs text-slate-400 pr-1">%</span>
      </div>
      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">= {calculatedProfit} 元</span>
      {/* 长一点的应用按钮 */}
      <button
        onClick={() => setActualProfit(calculatedProfit)}
        className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors shadow-sm"
      >
        应用
      </button>
    </div>
  </div>
);

// ============================================================================
// 主组件
// ============================================================================

const RequestDrawer: React.FC<Props> = ({ onClose }) => {
  const [module, setModule] = useState<'pricing' | 'anomaly'>('pricing');
  const [pricingSubType, setPricingSubType] = useState('');
  const [anomalyType, setAnomalyType] = useState('size');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [quoteList, setQuoteList] = useState<any[]>([]);

  // 通用表单
  const [shopName, setShopName] = useState('');
  const [targetCodes, setTargetCodes] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [refCode, setRefCode] = useState('');
  const [refPrice, setRefPrice] = useState('');
  const [samePriceList, setSamePriceList] = useState<any[]>([]);
  const [increasePrice, setIncreasePrice] = useState('');
  const [increaseList, setIncreaseList] = useState<any[]>([]);

  // 非毛织表单
  const [skc, setSkc] = useState('');
  const [fabrics, setFabrics] = useState<FabricItem[]>([{ id: 1, name: '', width: '', weight: '', price: '', usage: '', loss: '' }]);
  const [accessories, setAccessories] = useState<AccessoryItem[]>([{ id: 1, name: '', price: '', remark: '' }]);
  const [nwProcessCost, setNwProcessCost] = useState('');
  const [nwSecondProcess, setNwSecondProcess] = useState('');
  const [nwPackaging, setNwPackaging] = useState('1');
  const [nwProfitRate, setNwProfitRate] = useState('30');
  const [nwProfit, setNwProfit] = useState('');

  // 毛织表单
  const [styleNo, setStyleNo] = useState('');
  const [yarns, setYarns] = useState<YarnItem[]>([{ id: 1, name: '', weight: '', loss: '', price: '' }]);
  const [needleCount, setNeedleCount] = useState('');
  const [machinePrice, setMachinePrice] = useState('');
  const [machineTime, setMachineTime] = useState('');
  const [wFees, setWFees] = useState({ sewing: '', washing: '', finishing: '', button: '', zipper: '', packing: '1.5' });
  const [wProfitRate, setWProfitRate] = useState('30');

  // 计算逻辑
  const nwFabricTotal = useMemo(() => fabrics.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseFloat(item.usage) || 0) * (1 + (parseFloat(item.loss) || 0) / 100)), 0), [fabrics]);
  const nwAccessoryTotal = useMemo(() => accessories.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0), [accessories]);
  const nwOtherTotal = (parseFloat(nwProcessCost) || 0) + (parseFloat(nwSecondProcess) || 0) + (parseFloat(nwPackaging) || 0);
  const nwTotalCost = nwFabricTotal + nwAccessoryTotal + nwOtherTotal;
  const nwSuggestedProfit = (nwTotalCost * (parseFloat(nwProfitRate) / 100 || 0.3)).toFixed(2);
  const nwFinalPrice = nwTotalCost + (parseFloat(nwProfit) || 0);

  const wYarnTotal = useMemo(() => yarns.reduce((sum, item) => sum + (parseFloat(item.weight) || 0) * (1 + (parseFloat(item.loss) || 0) / 100) * ((parseFloat(item.price) || 0) / 1000), 0), [yarns]);
  const wMachineCost = (parseFloat(machinePrice) || 0) * (parseFloat(machineTime) || 0);
  const wProcessTotal = useMemo(() => wMachineCost + Object.values(wFees).reduce((sum, val) => sum + (parseFloat(val) || 0), 0), [wFees, wMachineCost]);
  const wTotalCost = wYarnTotal + wProcessTotal;
  const wSuggestedProfit = (wTotalCost * (parseFloat(wProfitRate) / 100 || 0.3)).toFixed(2);

  // 毛织实际利润 state（需要在使用前声明）
  const [wProfit, setWProfit] = useState('');
  const wFinalPrice = wTotalCost + (parseFloat(wProfit) || 0);

  useEffect(() => {
    if (pricingSubType.includes('报价单')) {
      setShowSecondary(true);
      setPreviewMode(false);
    } else {
      setShowSecondary(false);
    }
    // 二级模块变化时清空表单
    setTargetCodes('');
    setSuggestedPrice('');
    setRefCode('');
    setRefPrice('');
    setSamePriceList([]);
    setIncreasePrice('');
    setIncreaseList([]);
    setQuoteList([]);
    setSkc('');
    setStyleNo('');
    setNwProfit('');
    setWProfit('');
    setShopName('');
  }, [pricingSubType]);

  // 异常类二级模块变化时清空表单
  useEffect(() => {
    setTargetCodes('');
  }, [anomalyType]);

  const updateItem = (list: any[], setList: any, id: number, key: string, val: string) => setList(list.map((i: any) => i.id === id ? { ...i, [key]: val } : i));
  const addItem = (list: any[], setList: any, init: any) => setList([...list, { ...init, id: Date.now() }]);
  const removeItem = (list: any[], setList: any, id: number) => list.length > 1 && setList(list.filter((i: any) => i.id !== id));

  const handleAddSamePrice = () => { /* ... */ setSamePriceList([...samePriceList, ...targetCodes.split(/[\s\n]+/).filter(c => c.trim()).map(code => ({ shopName, targetCode: code, refCode, refPrice, suggestedPrice }))]); setTargetCodes(''); };
  const handleAddIncrease = () => { /* ... */ setIncreaseList([...increaseList, ...targetCodes.split(/[\s\n]+/).filter(c => c.trim()).map(code => ({ shopName, targetCode: code, increasePrice }))]); setTargetCodes(''); };

  const confirmAddQuote = () => {
    const isWool = pricingSubType === '报价单 (毛织)';
    const item = { type: pricingSubType, code: isWool ? styleNo : skc, price: isWool ? wFinalPrice.toFixed(2) : nwFinalPrice.toFixed(2), shop: shopName };
    if (!item.code || parseFloat(item.price) <= 0) return alert('请完善信息');
    setQuoteList([...quoteList, item]);
    setPreviewMode(false);
    if (isWool) { setStyleNo(''); setWProfit(''); } else { setSkc(''); setNwProfit(''); }
    alert('已添加到待提交列表');
  };

  if (isSubmitted) return ( /* Success Screen */ <div className="fixed inset-0 z-[100] flex items-center justify-end"><div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose}></div><div className="relative w-full max-w-[500px] h-full bg-white flex flex-col items-center justify-center p-12"><span className="material-symbols-outlined text-[100px] text-emerald-500 mb-6">check_circle</span><h2 className="text-2xl font-black text-navy-700 mb-2">提交成功</h2><button onClick={onClose} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">返回工作台</button></div></div>);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end overflow-hidden">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose}></div>
      <div className="flex h-full relative z-10 transition-all duration-300">

        {/* 二级抽屉 */}
        {showSecondary && (
          <div className="w-[850px] h-full bg-[#f1f5f9] border-r border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-300">
            <div className="px-6 py-4 border-b border-slate-200 bg-[#2c3e50] text-white flex justify-between items-center shrink-0">
              <h4 className="font-bold flex items-center gap-2 text-sm tracking-tight"><span className="material-symbols-outlined text-sm">assignment</span>{pricingSubType} 填写 {previewMode && '(预览)'}</h4>
              <button onClick={() => setPricingSubType('')} className="material-symbols-outlined text-white/70 hover:text-white">close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 text-[12px] text-slate-700">
              {/* --- 预览模式 --- */}
              {previewMode ? (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-white p-6 shadow-lg border border-slate-200 mx-auto max-w-[800px]">
                    <h2 className="text-center text-xl font-bold text-slate-800 mb-6 border-b pb-4">{pricingSubType} 预览</h2>

                    {/* 表头信息 */}
                    <table className="w-full border-collapse border border-black mb-6 text-sm">
                      <tbody><tr><td className="border border-black p-2 bg-gray-100 font-bold w-24">{pricingSubType.includes('非') ? 'SKC' : '款号'}</td><td className="border border-black p-2">{pricingSubType.includes('非') ? skc : styleNo}</td><td className="border border-black p-2 bg-gray-100 font-bold w-24">商家昵称</td><td className="border border-black p-2">{shopName}</td></tr></tbody>
                    </table>

                    {/* 明细表格 */}
                    <table className="w-full border-collapse border border-black mb-6 text-xs text-center">
                      {pricingSubType.includes('非') ? (
                        <>
                          <thead><tr className="bg-gray-100 font-bold"><td className="border border-black p-1">类别</td><td className="border border-black p-1">名称</td><td className="border border-black p-1">单价</td><td className="border border-black p-1">用量</td><td className="border border-black p-1">损耗</td><td className="border border-black p-1">成本</td></tr></thead>
                          <tbody>
                            {fabrics.map((f, i) => (<tr key={i}><td className="border border-black p-1">面料</td><td className="border border-black p-1">{f.name}</td><td className="border border-black p-1">{f.price}</td><td className="border border-black p-1">{f.usage}</td><td className="border border-black p-1">{f.loss}%</td><td className="border border-black p-1 bg-gray-50">{((parseFloat(f.price) || 0) * (parseFloat(f.usage) || 0) * (1 + (parseFloat(f.loss) || 0) / 100)).toFixed(2)}</td></tr>))}
                            {accessories.map((a, i) => (<tr key={i}><td className="border border-black p-1">辅料</td><td className="border border-black p-1">{a.name}</td><td className="border border-black p-1">{a.price}</td><td className="border border-black p-1">-</td><td className="border border-black p-1">-</td><td className="border border-black p-1 bg-gray-50">{parseFloat(a.price).toFixed(2)}</td></tr>))}
                            <tr className="font-bold bg-gray-50"><td className="border border-black p-2 text-right" colSpan={5}>面辅料合计：</td><td className="border border-black p-2">{(nwFabricTotal + nwAccessoryTotal).toFixed(2)}</td></tr>
                          </tbody>
                        </>
                      ) : (
                        <>
                          <thead><tr className="bg-gray-100 font-bold"><td className="border border-black p-1">纱线名称</td><td className="border border-black p-1">净重</td><td className="border border-black p-1">损耗</td><td className="border border-black p-1">单价/kg</td><td className="border border-black p-1">金额</td></tr></thead>
                          <tbody>
                            {yarns.map((y, i) => (<tr key={i}><td className="border border-black p-1">{y.name}</td><td className="border border-black p-1">{y.weight}</td><td className="border border-black p-1">{y.loss}%</td><td className="border border-black p-1">{y.price}</td><td className="border border-black p-1 bg-gray-50">{((parseFloat(y.weight) || 0) * (1 + (parseFloat(y.loss) || 0) / 100) * ((parseFloat(y.price) || 0) / 1000)).toFixed(2)}</td></tr>))}
                            <tr className="font-bold bg-gray-50"><td className="border border-black p-2 text-right" colSpan={4}>纱线小计：</td><td className="border border-black p-2">{wYarnTotal.toFixed(2)}</td></tr>
                          </tbody>
                        </>
                      )}
                    </table>

                    {/* 左图右表 */}
                    <div className="flex gap-4">
                      {/* 主图 (大) */}
                      <div className="w-5/12 border border-black p-2 flex flex-col items-center justify-center bg-gray-50 min-h-[200px]">
                        <span className="material-symbols-outlined text-4xl text-gray-300">image</span>
                        <span className="text-gray-400 text-xs mt-2 text-center">款式主图<br />(生成预览)</span>
                      </div>

                      {/* 右侧费用 */}
                      <div className="w-7/12">
                        <table className="w-full border-collapse border border-black mb-4 text-xs">
                          <thead><tr className="bg-gray-100 font-bold text-center"><td className="border border-black p-1" colSpan={2}>费用明细</td></tr></thead>
                          <tbody>
                            {pricingSubType.includes('非') ? (
                              <><tr><td className="border border-black p-1">加工/二次/包装</td><td className="border border-black p-1 text-right">{nwOtherTotal.toFixed(2)}</td></tr></>
                            ) : (
                              <>
                                <tr><td className="border border-black p-1">织机 ({needleCount}针)</td><td className="border border-black p-1 text-right">{wMachineCost.toFixed(2)}</td></tr>
                                {Object.entries(wFees).map(([k, v]) => parseFloat(v) > 0 && <tr key={k}><td className="border border-black p-1 capitalize">{k}</td><td className="border border-black p-1 text-right">{parseFloat(v).toFixed(2)}</td></tr>)}
                              </>
                            )}
                            <tr className="font-bold bg-gray-50"><td className="border border-black p-1 text-right">费用小计</td><td className="border border-black p-1 text-right">{pricingSubType.includes('非') ? nwOtherTotal.toFixed(2) : wProcessTotal.toFixed(2)}</td></tr>
                          </tbody>
                        </table>
                        <table className="w-full border-collapse border border-black text-sm">
                          <tbody>
                            <tr><td className="border border-black p-2">总成本</td><td className="border border-black p-2 text-right">{pricingSubType.includes('非') ? nwTotalCost.toFixed(2) : wTotalCost.toFixed(2)}</td></tr>
                            <tr><td className="border border-black p-2">利润 ({pricingSubType.includes('非') ? nwProfitRate : wProfitRate}%)</td><td className="border border-black p-2 text-right">{pricingSubType.includes('非') ? nwProfit : wProfit}</td></tr>
                            <tr className="bg-black text-white font-bold"><td className="border border-black p-2 text-right">FOB</td><td className="border border-black p-2 text-right">¥ {pricingSubType.includes('非') ? nwFinalPrice.toFixed(2) : wFinalPrice.toFixed(2)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 底部辅图缩略栏 (新需求) */}
                    <div className="flex gap-4 mt-6 pt-4 border-t border-dashed border-slate-300">
                      <div className="text-[10px] text-slate-400 font-bold w-12 pt-2">附图:</div>
                      <div className="flex gap-2">
                        <div className="w-16 h-16 bg-gray-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">唛架1</div>
                        <div className="w-16 h-16 bg-gray-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">色卡1</div>
                        <div className="w-16 h-16 bg-gray-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-300">唛架2</div>
                        <div className="w-16 h-16 bg-gray-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-300">色卡2</div>
                      </div>
                    </div>
                  </div>

                  {/* 预览操作栏 */}
                  <div className="flex gap-4 px-10 pb-6">
                    <button onClick={() => setPreviewMode(false)} className="flex-1 py-3 border border-slate-300 bg-white text-slate-600 font-bold rounded-lg hover:bg-slate-50">返回修改</button>
                    <button onClick={confirmAddQuote} className="flex-[2] py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 shadow-lg">确认添加至列表</button>
                  </div>
                </div>
              ) : (
                /* --- 编辑模式 (垂直布局) --- */
                <div className="animate-in fade-in duration-300">
                  {pricingSubType === '报价单 (非毛织)' && (
                    <>
                      <SectionBox title="基本信息">
                        <div className="grid grid-cols-2 gap-6">
                          <div><label className="block mb-1 font-bold text-slate-500 text-xs">SKC</label><VisibleInput value={skc} onChange={(e: any) => setSkc(e.target.value)} placeholder="请输入SKC" /></div>
                          <div><label className="block mb-1 font-bold text-slate-500 text-xs">商家昵称</label><VisibleInput value={shopName} onChange={(e: any) => setShopName(e.target.value)} placeholder="请输入商家名" /></div>
                        </div>
                      </SectionBox>

                      <SectionBox title="面料明细" action={<button onClick={() => addItem(fabrics, setFabrics, { name: '', width: '', weight: '', price: '', usage: '', loss: '' })} className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded">+ 添加</button>}>
                        <table className="w-full border-collapse">
                          <thead className="bg-slate-100 text-slate-500 border-b border-slate-200">
                            <tr><th className="p-2 text-left w-32">材料名称</th><th className="p-2 w-16 text-center">幅宽</th><th className="p-2 w-16 text-center">克重</th><th className="p-2 w-20 text-center">单价</th><th className="p-2 w-16 text-center">用量</th><th className="p-2 w-16 text-center">损耗%</th><th className="p-2 w-20 text-right">成本</th><th className="w-8"></th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {fabrics.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-1"><TableInput align="left" value={item.name} onChange={(e: any) => updateItem(fabrics, setFabrics, item.id, 'name', e.target.value)} placeholder="面料名" highlight /></td>
                                <td className="p-1"><TableInput value={item.width} onChange={(e: any) => updateItem(fabrics, setFabrics, item.id, 'width', e.target.value)} /></td>
                                <td className="p-1"><TableInput value={item.weight} onChange={(e: any) => updateItem(fabrics, setFabrics, item.id, 'weight', e.target.value)} /></td>
                                <td className="p-1"><TableInput value={item.price} onChange={(e: any) => updateItem(fabrics, setFabrics, item.id, 'price', e.target.value)} /></td>
                                <td className="p-1"><TableInput value={item.usage} onChange={(e: any) => updateItem(fabrics, setFabrics, item.id, 'usage', e.target.value)} /></td>
                                <td className="p-1"><TableInput value={item.loss} onChange={(e: any) => updateItem(fabrics, setFabrics, item.id, 'loss', e.target.value)} /></td>
                                <td className="p-1 text-right font-bold text-slate-700">{((parseFloat(item.price) || 0) * (parseFloat(item.usage) || 0) * (1 + (parseFloat(item.loss) || 0) / 100)).toFixed(2)}</td>
                                <td className="p-1 text-center"><button onClick={() => removeItem(fabrics, setFabrics, item.id)} className="text-slate-300 hover:text-red-500 font-bold">×</button></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 font-bold text-slate-600"><tr><td colSpan={6} className="p-2 text-right">面料小计：</td><td className="p-2 text-right">{nwFabricTotal.toFixed(2)}</td><td></td></tr></tfoot>
                        </table>
                      </SectionBox>

                      <SectionBox title="辅料明细" action={<button onClick={() => addItem(accessories, setAccessories, { name: '', price: '', remark: '' })} className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded">+ 添加</button>}>
                        <table className="w-full border-collapse">
                          <thead className="bg-slate-100 text-slate-500 border-b border-slate-200"><tr><th className="p-2 text-left w-32">材料名称</th><th className="p-2 w-24 text-center">单价</th><th className="p-2 text-left pl-4">备注</th><th className="w-8"></th></tr></thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {accessories.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-1"><TableInput align="left" value={item.name} onChange={(e: any) => updateItem(accessories, setAccessories, item.id, 'name', e.target.value)} placeholder="辅料名" highlight /></td>
                                <td className="p-1"><TableInput value={item.price} onChange={(e: any) => updateItem(accessories, setAccessories, item.id, 'price', e.target.value)} /></td>
                                <td className="p-1 pl-4"><TableInput align="left" value={item.remark} onChange={(e: any) => updateItem(accessories, setAccessories, item.id, 'remark', e.target.value)} placeholder="备注" /></td>
                                <td className="p-1 text-center"><button onClick={() => removeItem(accessories, setAccessories, item.id)} className="text-slate-300 hover:text-red-500 font-bold">×</button></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 font-bold text-slate-600"><tr><td colSpan={1} className="p-2 text-right">辅料小计：</td><td className="p-2 text-center">{nwAccessoryTotal.toFixed(2)}</td><td colSpan={2}></td></tr></tfoot>
                        </table>
                      </SectionBox>

                      <SectionBox title="其他费用与汇总">
                        <div className="space-y-2 text-sm">
                          {[['加工费用', nwProcessCost, setNwProcessCost], ['二次工艺', nwSecondProcess, setNwSecondProcess], ['包装耗材', nwPackaging, setNwPackaging]].map(([l, v, s]: any) => (
                            <div key={l} className="flex justify-between items-center"><span className="text-slate-600 pl-2">{l}</span><div className="w-24"><VisibleInput align="right" value={v} onChange={(e: any) => s(e.target.value)} /></div></div>
                          ))}
                          <div className="flex justify-between items-center bg-slate-50 p-2 font-bold text-slate-700 rounded"><span className="pl-2">其他费用小计</span><span>{nwOtherTotal.toFixed(2)}</span></div>

                          {/* 利润控制组件 */}
                          <ProfitControl actualProfit={nwProfit} setActualProfit={setNwProfit} rate={nwProfitRate} setRate={setNwProfitRate} calculatedProfit={nwSuggestedProfit} />
                        </div>
                      </SectionBox>

                      <div className="bg-[#2c3e50] text-white p-5 rounded-lg shadow-lg flex justify-between items-center mb-6">
                        <div><p className="text-[10px] opacity-60 uppercase font-black">FOB PRICE</p><p className="text-lg font-black">最终核定报价</p></div>
                        <div className="text-right"><p className="text-2xl font-black">¥ {nwFinalPrice.toFixed(2)}</p></div>
                      </div>

                      <SectionBox title="图片凭证"><InputImageGrid /></SectionBox>
                      <div className="sticky bottom-0 z-10 bg-[#f1f5f9] pt-4 pb-2"><button onClick={() => setPreviewMode(true)} className="w-full py-3 bg-slate-800 text-white font-bold rounded-lg shadow hover:bg-slate-700 transition-all flex items-center justify-center gap-2"><span className="material-symbols-outlined text-sm">visibility</span> 生成预览图</button></div>
                    </>
                  )}

                  {pricingSubType === '报价单 (毛织)' && (
                    <>
                      <SectionBox title="基本信息">
                        <div className="grid grid-cols-2 gap-6">
                          <div><label className="block mb-1 font-bold text-slate-500 text-xs">款号</label><VisibleInput value={styleNo} onChange={(e: any) => setStyleNo(e.target.value)} placeholder="请输入款号" /></div>
                          <div><label className="block mb-1 font-bold text-slate-500 text-xs">商家昵称</label><VisibleInput value={shopName} onChange={(e: any) => setShopName(e.target.value)} placeholder="请输入商家名" /></div>
                        </div>
                      </SectionBox>

                      <SectionBox title="纱线明细" action={<button onClick={() => addItem(yarns, setYarns, { name: '', weight: '', loss: '', price: '' })} className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded">+ 添加</button>}>
                        <table className="w-full border-collapse">
                          <thead className="bg-slate-100 text-slate-500 border-b border-slate-200"><tr><th className="p-2 text-left pl-3">纱线名称</th><th className="p-2 w-16 text-center">单位</th><th className="p-2 w-20 text-center">净重</th><th className="p-2 w-20 text-center">损耗%</th><th className="p-2 w-24 text-center">单价/kg</th><th className="p-2 w-24 text-right pr-3">金额</th><th className="p-2 w-10"></th></tr></thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {yarns.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-1 pl-2"><TableInput align="left" value={item.name} onChange={(e: any) => updateItem(yarns, setYarns, item.id, 'name', e.target.value)} placeholder="纱线名" highlight /></td>
                                <td className="p-1 text-center text-xs text-slate-400">克</td>
                                <td className="p-1"><TableInput value={item.weight} onChange={(e: any) => updateItem(yarns, setYarns, item.id, 'weight', e.target.value)} /></td>
                                <td className="p-1"><TableInput value={item.loss} onChange={(e: any) => updateItem(yarns, setYarns, item.id, 'loss', e.target.value)} /></td>
                                <td className="p-1"><TableInput value={item.price} onChange={(e: any) => updateItem(yarns, setYarns, item.id, 'price', e.target.value)} /></td>
                                <td className="p-1 text-right pr-3 font-bold text-slate-700">{((parseFloat(item.weight) || 0) * (1 + (parseFloat(item.loss) || 0) / 100) * ((parseFloat(item.price) || 0) / 1000)).toFixed(2)}</td>
                                <td className="p-1 text-center"><button onClick={() => removeItem(yarns, setYarns, item.id)} className="text-slate-300 hover:text-red-500 font-bold px-2">×</button></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 font-bold text-slate-600"><tr><td colSpan={5} className="p-2 text-right">纱线小计：</td><td className="p-2 text-right pr-3">{wYarnTotal.toFixed(2)}</td><td></td></tr></tfoot>
                        </table>
                      </SectionBox>

                      <SectionBox title="生产工艺成本">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center"><span className="text-slate-600 pl-2">针数</span><div className="w-24"><VisibleInput align="right" placeholder="12针" value={needleCount} onChange={(e: any) => setNeedleCount(e.target.value)} /></div></div>
                          <div className="flex justify-between items-center"><span className="text-slate-600 pl-2">每分钟织机单价(元)</span><div className="w-24"><VisibleInput align="right" value={machinePrice} onChange={(e: any) => setMachinePrice(e.target.value)} /></div></div>
                          <div className="flex justify-between items-center"><span className="text-slate-600 pl-2">织机时间(分钟)</span><div className="w-24"><VisibleInput align="right" value={machineTime} onChange={(e: any) => setMachineTime(e.target.value)} /></div></div>
                          <div className="flex justify-between items-center bg-slate-50 p-2 font-bold text-slate-700 rounded"><span className="pl-2">织机成本</span><span>{wMachineCost.toFixed(2)}</span></div>
                          {Object.entries(wFees).map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center"><span className="text-slate-600 pl-2 capitalize">{k}</span><div className="w-24"><VisibleInput align="right" value={v} onChange={(e: any) => setWFees({ ...wFees, [k]: e.target.value })} /></div></div>
                          ))}
                          <div className="flex justify-between items-center border-t border-slate-100 pt-2 font-bold text-blue-600"><span className="pl-2">工艺成本小计</span><span>{wProcessTotal.toFixed(2)}</span></div>
                        </div>
                      </SectionBox>

                      <SectionBox title="成本汇总">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-slate-50 p-2 rounded font-bold text-slate-700"><span className="pl-2">总成本</span><span>{wTotalCost.toFixed(2)}</span></div>
                          {/* 利润控制组件复用 */}
                          <ProfitControl actualProfit={wProfit} setActualProfit={setWProfit} rate={wProfitRate} setRate={setWProfitRate} calculatedProfit={wSuggestedProfit} />
                        </div>
                      </SectionBox>

                      <div className="bg-[#2c3e50] text-white p-5 rounded-lg shadow-lg flex justify-between items-center mb-6">
                        <div><p className="text-[10px] opacity-60 uppercase font-black">FOB PRICE</p><p className="text-lg font-black">最终核定报价</p></div>
                        <div className="text-right"><p className="text-2xl font-black">¥ {wFinalPrice.toFixed(2)}</p></div>
                      </div>

                      <SectionBox title="图片凭证"><InputImageGrid /></SectionBox>
                      <div className="sticky bottom-0 z-10 bg-[#f1f5f9] pt-4 pb-2"><button onClick={() => setPreviewMode(true)} className="w-full py-3 bg-slate-800 text-white font-bold rounded-lg shadow hover:bg-slate-700 transition-all flex items-center justify-center gap-2"><span className="material-symbols-outlined text-sm">visibility</span> 生成预览图</button></div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 主抽屉 (保持不变) */}
        <div className="w-[500px] h-full bg-white shadow-2xl flex flex-col transition-transform">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#2c3e50] text-white shrink-0">
            <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">post_add</span><h3 className="font-bold text-sm tracking-tight">发起业务申请</h3></div>
            <button onClick={onClose} className="material-symbols-outlined hover:rotate-90 transition-transform">close</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/30 custom-scrollbar">
            <section><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">申请大类</label><div className="flex p-1 bg-slate-200/50 rounded-xl"><button onClick={() => setModule('pricing')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${module === 'pricing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>核价类</button><button onClick={() => setModule('anomaly')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${module === 'anomaly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>异常类</button></div></section>
            {module === 'pricing' ? (<div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300"><div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5"><div><label className="block text-xs font-bold text-slate-500 mb-1.5">二级模块</label><select className="w-full border border-slate-200 rounded-lg text-sm h-10 px-2 font-medium" value={pricingSubType} onChange={e => setPricingSubType(e.target.value)}><option value="">(请选择)</option><option>报价单 (毛织)</option><option>报价单 (非毛织)</option><option>同款同价</option><option>申请涨价</option></select></div>
              {quoteList.length > 0 && (pricingSubType.includes('报价单')) && (<div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-[200px] overflow-y-auto animate-in fade-in"><div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-600">待提交报价单列表</div><table className="w-full text-left text-[11px]"><tbody className="divide-y divide-slate-100">{quoteList.map((item, idx) => (<tr key={idx} className="hover:bg-slate-50"><td className="p-2 font-bold">{item.type.includes('毛织') ? '毛' : '非'} | {item.code}</td><td className="p-2 text-slate-500">{item.shop}</td><td className="p-2 font-bold text-emerald-600 text-right">¥ {item.price}</td><td className="p-2 text-right w-10"><button onClick={() => setQuoteList(quoteList.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 material-symbols-outlined text-sm">delete</button></td></tr>))}</tbody></table></div>)}
              {pricingSubType === '同款同价' && (<div className="space-y-4 animate-in fade-in duration-300"><div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100"><div><label className="block text-xs font-bold text-navy-700 mb-1.5">需复核 SKC</label><textarea className="w-full border border-slate-300 rounded text-sm p-2 min-h-[80px] bg-white outline-none focus:border-blue-500" value={targetCodes} onChange={e => setTargetCodes(e.target.value)} placeholder="多个SKC请换行分隔" /></div><div><label className="block text-xs font-bold text-navy-700 mb-1.5">系统建议价</label><VisibleInput value={suggestedPrice} onChange={(e: any) => setSuggestedPrice(e.target.value)} /></div><div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4"><div><label className="block text-[10px] font-bold text-navy-700 mb-1">已核价 SKC</label><VisibleInput value={refCode} onChange={(e: any) => setRefCode(e.target.value)} /></div><div><label className="block text-[10px] font-bold text-navy-700 mb-1">已核价SKC通过价</label><VisibleInput value={refPrice} onChange={(e: any) => setRefPrice(e.target.value)} /></div></div>{parseFloat(refPrice) > 0 && parseFloat(suggestedPrice) > 0 && parseFloat(refPrice) <= parseFloat(suggestedPrice) && (<div className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded">⚠️ 已核价SKC通过价必须大于系统建议价</div>)}<div className="flex gap-2"><button onClick={() => { if (parseFloat(refPrice) <= parseFloat(suggestedPrice)) { alert('已核价SKC通过价必须大于系统建议价'); return; } handleAddSamePrice(); }} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-600">添加</button></div></div>{samePriceList.length > 0 && (<div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-[180px] overflow-y-auto"><table className="w-full text-left text-[11px]"><thead className="bg-[#f2f2f2] border-b border-slate-200 font-bold sticky top-0 z-10"><tr><th className="p-2.5">需复核SKC</th><th className="p-2.5">申请价格</th><th className="p-2.5 text-right"></th></tr></thead><tbody className="divide-y divide-slate-100">{samePriceList.map((item, idx) => (<tr key={idx}><td className="p-2.5 font-bold">{item.targetCode}</td><td className="p-2.5 font-bold text-emerald-600">¥{item.refPrice}</td><td className="p-2.5 text-right"><button onClick={() => setSamePriceList(samePriceList.filter((_, i) => i !== idx))} className="material-symbols-outlined text-slate-300 hover:text-red-500 text-base">delete</button></td></tr>))}</tbody></table></div>)}</div>)}
              {pricingSubType === '申请涨价' && (<div className="space-y-4 animate-in fade-in duration-300"><div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100"><div><label className="block text-xs font-bold text-navy-700 mb-1.5">需涨价 SKU</label><textarea className="w-full border border-slate-300 rounded text-sm p-2 min-h-[80px] bg-white outline-none focus:border-blue-500" value={targetCodes} onChange={e => setTargetCodes(e.target.value)} placeholder="多个SKU请换行分隔" /></div><div><label className="block text-xs font-bold text-navy-700 mb-1.5">申请涨回价格</label><VisibleInput value={increasePrice} onChange={(e: any) => setIncreasePrice(e.target.value)} className="font-bold text-amber-600" /></div><div className="flex gap-2"><button onClick={handleAddIncrease} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-amber-600">添加</button></div></div>{increaseList.length > 0 && (<div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-[180px] overflow-y-auto"><table className="w-full text-left text-[11px]"><thead className="bg-[#f2f2f2] border-b border-slate-200 font-bold sticky top-0 z-10"><tr><th className="p-2.5">SKU</th><th className="p-2.5">价格</th><th className="p-2.5 text-right"></th></tr></thead><tbody className="divide-y divide-slate-100">{increaseList.map((item, idx) => (<tr key={idx}><td className="p-2.5 font-bold">{item.targetCode}</td><td className="p-2.5 font-bold text-amber-600">¥{item.increasePrice}</td><td className="p-2.5 text-right"><button onClick={() => setIncreaseList(increaseList.filter((_, i) => i !== idx))} className="material-symbols-outlined text-slate-300 hover:text-red-500 text-base">delete</button></td></tr>))}</tbody></table></div>)}</div>)}
              {(pricingSubType.includes('报价单')) && (<div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3 shadow-inner"><span className="material-symbols-outlined text-blue-500 text-xl">arrow_back</span><div><p className="text-xs text-blue-800 font-bold">请在左侧填写明细</p><p className="text-[10px] text-blue-700 mt-1 leading-relaxed font-medium">侧边栏已展开，请填写完整的成本明细并生成预览。</p></div></div>)}</div></div>) : (<div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300"><div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"><div><label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">二级模块</label><select className="w-full border border-slate-200 rounded-lg text-sm h-10 px-2 font-medium" value={anomalyType} onChange={e => setAnomalyType(e.target.value)}><option value="size">尺码问题</option><option value="discontinue">申请下架</option><option value="image">图片异常</option><option value="bulk">大货异常</option></select></div><div><label className="block text-xs font-bold text-navy-700 mb-1.5">{anomalyType === 'size' ? '商品SPU' : anomalyType === 'bulk' ? 'WB单号' : '商品SKC'}</label><VisibleInput value={targetCodes} onChange={(e: any) => setTargetCodes(e.target.value)} placeholder={anomalyType === 'bulk' ? '请输入WB单号' : ''} /></div></div></div>)}
          </div>
          <div className="p-5 border-t border-slate-200 bg-white flex gap-3 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.04)]"><button onClick={async () => {
            if (!pricingSubType && module === 'pricing') return alert('请先选择二级类目');
            if (!confirm('确认提交所有申请吗？')) return;
            try {
              if (module === 'pricing') {
                if (pricingSubType.includes('报价单') && quoteList.length > 0) {
                  await createQuoteRequest(pricingSubType, shopName, quoteList.map(q => ({
                    type: q.type.includes('毛织') ? 'WOOL' as const : 'NORMAL' as const,
                    code: q.code,
                    price: parseFloat(q.price)
                  })));
                } else if (pricingSubType === '同款同价' && samePriceList.length > 0) {
                  await createSamePriceRequest(shopName, samePriceList);
                } else if (pricingSubType === '申请涨价' && increaseList.length > 0) {
                  await createPriceIncreaseRequest(shopName, increaseList);
                }
              } else {
                const anomalyLabels: Record<string, string> = { size: '尺码问题', discontinue: '申请下架', image: '图片异常', bulk: '大货异常' };
                const codes = targetCodes.split(/[\s\n]+/).filter(c => c.trim());
                if (codes.length > 0) {
                  await createAnomalyRequest(anomalyLabels[anomalyType] || anomalyType, codes);
                }
              }
              // 直接关闭返回工作台，不显示成功页面
              onClose();
            } catch (err) {
              console.error('Submit error:', err);
              alert('提交失败，请重试');
            }
          }} className="flex-[2] py-3.5 bg-[#1677ff] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-blue-600 transition-all active:scale-[0.98]">提交所有申请</button><button onClick={onClose} className="flex-1 py-3.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">取消</button></div>
        </div>
      </div>
    </div>
  );
};

export default RequestDrawer;