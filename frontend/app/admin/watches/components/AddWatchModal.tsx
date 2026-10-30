'use client';

// Modal for manually adding a new watch to the database
import React, { useState, useRef } from 'react';
import { Brand, Collection, adminCreateWatch, adminUploadWatchImageTemp, adminTempFromUrl } from '@/lib/api';
import { imageTransformations } from '@/lib/cloudinary';
import ImageCropper from './ImageCropper';

interface AddWatchModalProps {
    brands: Brand[];
    collections: Collection[];
    onClose: () => void;
    onSave: () => void;
}

const DEFAULT_SPECS = '{"productionStatus":null,"dial":{},"case":{},"movement":{},"strap":{}}';

export default function AddWatchModal({ brands, collections, onClose, onSave }: AddWatchModalProps) {
    const [brandId, setBrandId] = useState<number | ''>('');
    const [collectionId, setCollectionId] = useState<number | ''>('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('0');
    const [stockQuantity, setStockQuantity] = useState('0');
    const [specsJson, setSpecsJson] = useState(DEFAULT_SPECS);
    const [imagePublicId, setImagePublicId] = useState('');
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');

    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [cropMode, setCropMode] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [cloudinaryUrlInput, setCloudinaryUrlInput] = useState('');
    const [importingFromUrl, setImportingFromUrl] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredCollections = collections.filter(c => !brandId || c.brandId === brandId);

    const stageFile = (file: File) => {
        setUploadError('');
        setPendingFile(file);
        setCropMode(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) stageFile(file);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) { stageFile(file); return; }
            }
        }
    };

    const uploadFile = async (file: File) => {
        setUploadingImage(true);
        setUploadError('');
        try {
            const slugifiedName = (name || 'watch').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').toLowerCase();
            const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'png';
            const safeFile = new File([file], `upload.${ext}`, { type: file.type });
            const result = await adminUploadWatchImageTemp(safeFile, slugifiedName);
            if (result.success && result.publicId) {
                setImagePublicId(result.publicId);
                setUploadedImageUrl(result.imageUrl || '');
            }
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : "رفع الصورة منفعش");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleImportFromUrl = async () => {
        if (!cloudinaryUrlInput.trim()) return;
        setImportingFromUrl(true);
        setUploadError('');
        try {
            const result = await adminTempFromUrl(cloudinaryUrlInput.trim());
            if (result.success && result.publicId) {
                setImagePublicId(result.publicId);
                setUploadedImageUrl(result.imageUrl || '');
                setCloudinaryUrlInput('');
            }
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : "استيراد الصورة منفعش");
        } finally {
            setImportingFromUrl(false);
        }
    };

    const handleUseAsIs = async () => {
        if (!pendingFile) return;
        const file = pendingFile;
        setPendingFile(null);
        setCropMode(false);
        await uploadFile(file);
    };

    const handleCropConfirm = async (croppedFile: File) => {
        setPendingFile(null);
        await uploadFile(croppedFile);
    };

    const handleSave = async () => {
        if (!brandId) { setSaveError('Please select a brand'); return; }
        if (!name.trim()) { setSaveError('Name is required'); return; }
        try {
            setSaving(true);
            setSaveError('');
            await adminCreateWatch({
                name: name.trim(),
                description: description.trim(),
                currentPrice: parseFloat(price) || 0,
                stockQuantity: Math.max(0, parseInt(stockQuantity, 10) || 0),
                image: imagePublicId,
                brandId: brandId as number,
                collectionId: collectionId ? collectionId as number : null,
                specs: specsJson,
            });
            onSave();
        } catch (err: unknown) {
            setSaveError(err instanceof Error ? err.message : "معرفناش نضيف الساعة");
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm overflow-y-auto"
            data-lenis-prevent="true"
            onPaste={handlePaste}
            tabIndex={0}
            onClick={onClose}
        >
            <div className="flex min-h-full items-center justify-center p-6 pt-24">
            <div className="bg-[#111] border border-white/20 p-8 rounded-xl max-w-5xl w-full text-white grid grid-cols-2 gap-8 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl">&times;</button>

                {/* Left Column: Image */}
                <div>
                    <h2 className="text-2xl font-bold mb-4 font-playfair text-[#f0e6d2]">صورة الساعة</h2>

                    {pendingFile && cropMode ? (
                        <ImageCropper
                            rawFile={pendingFile}
                            onConfirm={handleCropConfirm}
                            onCancel={() => { setPendingFile(null); setCropMode(false); }}
                        />
                    ) : pendingFile && !cropMode ? (
                        <>
                            <div className="bg-black/50 p-4 border border-white/10 rounded-lg flex flex-col items-center justify-center mb-4 h-[350px]">
                                <img
                                    src={URL.createObjectURL(pendingFile)}
                                    alt="Staged preview"
                                    className="object-contain max-h-full max-w-full rounded"
                                />
                            </div>
                            <p className="text-sm text-gray-400 mb-3 text-center">الصورة جاهزة. ارفعها زي ما هي أو عدّل الكادر الأول.</p>
                            <div className="flex gap-3 justify-center mb-3">
                                <button className="px-4 py-2 border border-white/30 rounded hover:bg-white/10 text-sm" onClick={() => { setPendingFile(null); setCropMode(false); }}>إلغاء</button>
                                <button className="px-4 py-2 border border-[#f0e6d2]/50 rounded hover:bg-[#f0e6d2]/10 text-sm text-[#f0e6d2]" onClick={() => setCropMode(true)}>قص وعدّل</button>
                                <button className="px-4 py-2 bg-[#f0e6d2] text-black rounded font-medium text-sm" onClick={handleUseAsIs}>استخدمها زي ما هي</button>
                            </div>
                            {uploadError && <p className="text-red-400 text-sm mt-2">{uploadError}</p>}
                        </>
                    ) : (
                        <>
                            <div className="bg-black/50 p-4 border border-white/10 rounded-lg flex flex-col items-center justify-center mb-6 h-[400px]">
                                {imagePublicId ? (
                                    <img
                                        src={uploadedImageUrl || (imagePublicId.startsWith('http') ? imagePublicId : imageTransformations.detail(imagePublicId))}
                                        alt="Preview"
                                        className="object-contain max-h-full max-w-full rounded"
                                    />
                                ) : (
                                    <div className="text-gray-500 italic">لسه مفيش صورة</div>
                                )}
                            </div>

                            {imagePublicId && (
                                <div className="mb-4">
                                    <p className="text-sm text-gray-400 mb-1">معرّف الملف:</p>
                                    <input className="w-full bg-black/50 border border-white/20 p-2 text-sm text-gray-300 rounded" value={imagePublicId} readOnly />
                                </div>
                            )}

                            <div
                                className="border border-dashed border-white/30 rounded-lg p-6 text-center hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {uploadingImage ? "بنرفع..." : "دوس عشان ترفع صورة أو الصقها باستخدام Ctrl+V"}
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className="mt-3 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="أو الصق لينك صورة من Cloudinary"
                                    className="flex-1 bg-black/50 border border-white/20 rounded p-2 text-xs text-gray-300 placeholder-gray-600"
                                    value={cloudinaryUrlInput}
                                    onChange={e => setCloudinaryUrlInput(e.target.value)}
                                />
                                <button
                                    className="px-3 py-2 bg-[#bfa68a] text-black rounded text-xs font-medium disabled:opacity-40"
                                    onClick={handleImportFromUrl}
                                    disabled={importingFromUrl || !cloudinaryUrlInput.trim()}
                                >
                                    {importingFromUrl ? "بنستورد..." : "استورد"}
                                </button>
                            </div>
                            {uploadError && <p className="text-red-400 text-sm mt-2">{uploadError}</p>}
                        </>
                    )}
                </div>

                {/* Right Column: Watch Data */}
                <div className="flex flex-col h-full overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-4 font-playfair text-[#f0e6d2]">تفاصيل الساعة</h2>

                    {saveError && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4">{saveError}</div>}

                    <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-1">البراند <span className="text-red-400">*</span></label>
                        <select
                            className="w-full bg-black/60 border border-white/20 rounded p-2 text-white focus:outline-none focus:border-[#f0e6d2] transition-colors"
                            value={brandId}
                            onChange={e => { setBrandId(e.target.value ? Number(e.target.value) : ''); setCollectionId(''); }}
                        >
                            <option value="">اختار البراند...</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-1">المجموعة</label>
                        <select
                            className="w-full bg-black/60 border border-white/20 rounded p-2 text-white focus:outline-none focus:border-[#f0e6d2] transition-colors disabled:opacity-50"
                            value={collectionId}
                            onChange={e => setCollectionId(e.target.value ? Number(e.target.value) : '')}
                            disabled={!brandId}
                        >
                            <option value="">من غير مجموعة</option>
                            {filteredCollections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-1">رقم المرجع (اسم الساعة) <span className="text-red-400">*</span></label>
                        <input type="text" className="w-full bg-black/60 border border-white/20 rounded p-2 text-white" placeholder="e.g. 5711/1A-010" value={name} onChange={e => setName(e.target.value)} />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-1">الوصف</label>
                        <input type="text" className="w-full bg-black/60 border border-white/20 rounded p-2 text-white" placeholder="جملتين أو تلاتة عن الساعة وأهم تفاصيلها، بالإنجليزي" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-1">السعر بالدولار الأسترالي (0 = السعر عند السؤال)</label>
                        <input type="number" step="0.01" min="0" className="w-full bg-black/60 border border-white/20 rounded p-2 text-white" value={price} onChange={e => setPrice(e.target.value)} />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-1">المخزون المتاح</label>
                        <input type="number" step="1" min="0" max="100000" className="w-full bg-black/60 border border-white/20 rounded p-2 text-white" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} />
                    </div>

                    <div className="mb-6 flex-grow flex flex-col">
                        <label className="text-sm text-gray-400 mb-1 flex justify-between">
                            <span>المواصفات بصيغة JSON</span>
                            <span className="text-[#f0e6d2] cursor-pointer hover:underline" onClick={() => setSpecsJson(DEFAULT_SPECS)}>ارجع للأصل</span>
                        </label>
                        <textarea
                            className="w-full h-48 bg-black/60 border border-white/20 rounded p-2 text-white font-mono text-sm resize-none"
                            value={specsJson}
                            onChange={e => setSpecsJson(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-4 mt-auto">
                        <button className="px-6 py-2 border border-white/30 rounded hover:bg-white/10" onClick={onClose}>إلغاء</button>
                        <button
                            className="px-6 py-2 bg-[#f0e6d2] text-black rounded font-medium disabled:opacity-50"
                            onClick={handleSave}
                            disabled={saving || !!pendingFile || uploadingImage}
                        >
                            {saving ? "بنضيف..." : "ضيف ساعة"}
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}
