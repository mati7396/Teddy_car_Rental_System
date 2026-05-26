import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const UploadDocs = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, refreshUser, isAuthenticated, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState({ idCard: null, license: null });
    const carId = searchParams.get('carId');
    const packageId = searchParams.get('packageId');

    // Skip if already uploaded
    useEffect(() => {
        if (!authLoading && isAuthenticated && user?.profile?.idCardUrl && user?.profile?.driverLicenseUrl) {
            if (carId) {
                navigate(`/agreement?carId=${carId}`);
            } else if (packageId) {
                navigate(`/agreement?packageId=${packageId}`);
            } else {
                navigate('/agreement');
            }
        }
    }, [authLoading, isAuthenticated, user, carId, packageId, navigate]);

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setFiles(prev => ({ ...prev, [type]: file }));
        }
    };

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('document', file);
        const response = await api.upload('/upload/document', formData);
        return response.url;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!files.idCard || !files.license) return;

        setLoading(true);
        try {
            // Upload ID Card & License
            const [idCardUrl, licenseUrl] = await Promise.all([
                uploadFile(files.idCard),
                uploadFile(files.license)
            ]);

            // Persist to backend profile
            await api.patch('/auth/profile', {
                idCardUrl,
                driverLicenseUrl: licenseUrl,
                // Pass existing details to avoid clearing them if upsert logic needs them
                firstName: user?.profile?.firstName,
                lastName: user?.profile?.lastName,
                phoneNumber: user?.profile?.phoneNumber
            });

            // Sync local state
            await refreshUser();

            // Store URLs in session storage for the final booking step (as fallback)
            sessionStorage.setItem('idCardUrl', idCardUrl);
            sessionStorage.setItem('licenseUrl', licenseUrl);

            if (carId) {
                navigate(`/agreement?carId=${carId}`);
            } else if (packageId) {
                navigate(`/agreement?packageId=${packageId}`);
            } else {
                navigate('/agreement');
            }
            toast.success(t('booking.docsUploaded'));
        } catch (error) {
            toast.error(error.message || t('booking.failedToUploadDocs'));
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>;
    }

    return (
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-extrabold text-gray-900 font-display">{t('booking.verifyIdentity')}</h2>
                <div className="mt-4 flex flex-col items-center">
                    <div className="h-1.5 w-24 bg-primary rounded-full mb-4"></div>
                    <p className="text-lg text-gray-600">
                        {t('booking.verifyIdentityDesc')}
                    </p>
                </div>
            </div>

            <div className="bg-white shadow-xl border border-gray-100 sm:rounded-2xl mb-8 overflow-hidden">
                <div className="px-4 py-8 sm:p-10">
                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* ID Card Upload */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-sm font-semibold text-gray-800">{t('booking.nationalId')}</label>
                                {files.idCard && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={14} /> {t('booking.readyToUpload')}</span>}
                            </div>
                            <div className={`mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-xl transition-all duration-300 ${files.idCard ? 'border-primary bg-primary/5 shadow-inner' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'}`}>
                                <div className="space-y-4 text-center">
                                    <div className="relative inline-flex items-center justify-center">
                                        {files.idCard ? (
                                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-in zoom-in-50">
                                                <CheckCircle className="h-10 w-10 animate-bounce" />
                                            </div>
                                        ) : (
                                            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                <Upload className="h-10 w-10" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col text-sm text-gray-600">
                                        <label htmlFor="id-upload" className="relative cursor-pointer bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-md hover:shadow-lg inline-block mx-auto mb-2">
                                            <span>{files.idCard ? t('booking.changeFile') : t('booking.selectIdCard')}</span>
                                            <input id="id-upload" name="id-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'idCard')} accept="image/*,.pdf" />
                                        </label>
                                        <p className="text-gray-500 font-medium">{files.idCard ? files.idCard.name : t('booking.orDragDrop')}</p>
                                    </div>
                                    {!files.idCard && <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">PNG, JPG, PDF up to 10MB</p>}
                                </div>
                            </div>
                        </div>

                        {/* License Upload */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-sm font-semibold text-gray-800">{t('booking.driversLicense')}</label>
                                {files.license && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={14} /> {t('booking.readyToUpload')}</span>}
                            </div>
                            <div className={`mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-xl transition-all duration-300 ${files.license ? 'border-primary bg-primary/5 shadow-inner' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'}`}>
                                <div className="space-y-4 text-center">
                                    <div className="relative inline-flex items-center justify-center">
                                        {files.license ? (
                                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-in zoom-in-50">
                                                <CheckCircle className="h-10 w-10 animate-bounce" />
                                            </div>
                                        ) : (
                                            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                <FileText className="h-10 w-10" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col text-sm text-gray-600">
                                        <label htmlFor="license-upload" className="relative cursor-pointer bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-md hover:shadow-lg inline-block mx-auto mb-2">
                                            <span>{files.license ? t('booking.changeFile') : t('booking.selectLicense')}</span>
                                            <input id="license-upload" name="license-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'license')} accept="image/*,.pdf" />
                                        </label>
                                        <p className="text-gray-500 font-medium">{files.license ? files.license.name : t('booking.orDragDrop')}</p>
                                    </div>
                                    {!files.license && <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">PNG, JPG, PDF up to 10MB</p>}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="w-full sm:w-auto px-8 py-6 text-gray-500 hover:text-gray-700">
                                {t('booking.back')}
                            </Button>
                            <Button type="submit" disabled={loading || !files.idCard || !files.license} className="w-full sm:w-auto px-10 py-6 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all">
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                        {t('booking.uploadingDocs')}
                                    </>
                                ) : (
                                    t('booking.proceedToAgreement')
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="flex items-center justify-center gap-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-2"><div className="h-1 w-1 bg-gray-400 rounded-full"></div> {t('booking.secureTransmission')}</div>
                <div className="flex items-center gap-2"><div className="h-1 w-1 bg-gray-400 rounded-full"></div> {t('booking.privacyGuaranteed')}</div>
                <div className="flex items-center gap-2"><div className="h-1 w-1 bg-gray-400 rounded-full"></div> {t('booking.encryption')}</div>
            </div>
        </div>
    );
};

export default UploadDocs;
