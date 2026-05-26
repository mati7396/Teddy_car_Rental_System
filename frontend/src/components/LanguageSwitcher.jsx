import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    const currentLanguage = t('nav.currentLang');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none font-bold min-w-[100px]">
                <Languages size={18} className="text-primary" />
                <span className="text-sm uppercase">{currentLanguage}</span>
                <ChevronDown size={14} className="text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 rounded-xl border-gray-100 shadow-xl">
                <DropdownMenuItem
                    onClick={() => changeLanguage('en')}
                    className={`cursor-pointer font-bold ${i18n.language === 'en' ? 'text-primary bg-primary/5' : ''}`}
                >
                    English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => changeLanguage('am')}
                    className={`cursor-pointer font-bold ${i18n.language === 'am' ? 'text-primary bg-primary/5' : ''}`}
                >
                    አማርኛ
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSwitcher;
