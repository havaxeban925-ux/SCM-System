import React, { useRef, useState } from 'react';

interface ImageUploadProps {
    value?: string;
    onChange: (base64: string) => void;
    label?: string;
    placeholder?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, label = '上传图片', placeholder = '点击或拖拽图片到此处' }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = (file: File) => {
        if (!file) return;

        // 简单限制图片大小 (例如 2MB)，避免 Base64 过大卡顿
        if (file.size > 2 * 1024 * 1024) {
            alert('图片大小不能超过 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
                onChange(result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="form-group">
            {label && <label className="form-label">{label} <span style={{ color: 'red' }}>*</span></label>}

            <input
                type="file"
                ref={inputRef}
                accept="image/*"
                onChange={handleChange}
                style={{ display: 'none' }}
            />

            {!value ? (
                <div
                    className={`upload-area ${isDragging ? 'dragging' : ''}`}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${isDragging ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        borderRadius: 8,
                        padding: 32,
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: isDragging ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-secondary)',
                        transition: 'all 0.2s'
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--text-secondary)', marginBottom: 8 }}>cloud_upload</span>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{placeholder}</p>
                </div>
            ) : (
                <div
                    className="image-preview-container"
                    style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}
                >
                    <img
                        src={value}
                        alt="Preview"
                        style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'contain', background: '#f0f0f0' }}
                    />
                    <button
                        onClick={handleRemove}
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)'
                        }}
                        title="删除图片"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                    </button>
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: 8,
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <span
                            style={{ color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => inputRef.current?.click()}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                            更换图片
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
