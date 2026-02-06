export const getHandlerAlias = (name?: string) => {
    if (!name) return '';
    const map: Record<string, string> = {
        '铃酱': '铃',
        '阿允': '允',
        '阿秋': '秋',
        '阿桃': '桃'
    };
    return map[name] || name.charAt(0);
};

export const getHandlerColor = (name?: string) => {
    if (!name) return { backgroundColor: '#cbd5e1', color: '#334155' }; // Gray
    const map: Record<string, string> = {
        '铃酱': '#f472b6', // Pink
        '阿允': '#fbbf24', // Amber
        '阿秋': '#a78bfa', // Purple
        '阿桃': '#fb7185', // Rose
    };
    const bg = map[name] || '#94a3b8';
    return { backgroundColor: bg, color: '#fff' };
};
