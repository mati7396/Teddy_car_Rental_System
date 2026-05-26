import React from 'react';
import { useTranslation } from 'react-i18next';

const Privacy = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-50 py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-8">{t('privacyPage.title')}</h1>

                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-6 text-gray-600 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{t('privacyPage.s1Title')}</h2>
                        <p>{t('privacyPage.s1Desc')}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{t('privacyPage.s2Title')}</h2>
                        <p>{t('privacyPage.s2Desc')}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{t('privacyPage.s3Title')}</h2>
                        <p>{t('privacyPage.s3Desc')}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{t('privacyPage.s4Title')}</h2>
                        <p>{t('privacyPage.s4Desc')}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{t('privacyPage.s5Title')}</h2>
                        <p>{t('privacyPage.s5Desc')}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{t('privacyPage.s6Title')}</h2>
                        <p>{t('privacyPage.s6Desc')}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{t('privacyPage.s7Title')}</h2>
                        <p>{t('privacyPage.s7Desc')}</p>
                    </section>

                    <p className="text-sm text-gray-400 pt-4 border-t border-gray-100">
                        {t('termsPage.lastUpdated')}: {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
