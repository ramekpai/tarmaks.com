export const languages = {
  ru: 'Русский',
  en: 'English',
};

export const defaultLang = 'ru';

export const ui = {
  ru: {
    'nav.home': 'Главная',
    'nav.about': 'О себе',
    'nav.projects': 'Проекты',
    'nav.contact': 'Контакты',
    'site.title': 'Максим Тарасов, фронтенд-разработчик',
    'site.description': 'Портфолио фронтенд-разработчика',
    'footer.rights': 'Все права защищены',
    'intro.hi': 'Привет, меня зовут',
    'intro.name': 'Максим Тарасов',
    'intro.description': 'Я фронтенд-разработчик влюблённый в веб, доступность, интерфейсы и с желанием создавать лучшие UI и UX',
    'experience.description': 'Профессиональный опыт преимущественно связан с продуктовой разработкой в scrum-команде, а именно:',
    'card.scale.title': 'Масштабные решения',
    'card.scale.description': 'Разработка международного мультиязычного продукта с более чем 3 000 000 уникальных посетителей в месяц',
    'card.improvement.title': 'Улучшение продуктов',
    'card.improvement.description': 'Рефакторинг и оптимизация кодовой базы, повышение метрик и показателей',
    'card.uikit.title': 'Собственный ui-kit',
    'card.uikit.description_pre': 'Создал',
    'card.uikit.description': 'как личный проект в рамках компании. Участие в дизайне, разработка, документация и интеграция во флагманский продукт компании',
    'card.development.title': 'Общее развитие',
    'card.development.description': 'Внедрение новых инструментов и полезных практик, оптимизация и улучшение процессов',
    'card.teamwork.title': 'Командная работа',
    'card.teamwork.description': 'Активное участие в различных митингах, проведение код-ревью, менторство и помощь членам команды',
  },
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.projects': 'Projects',
    'nav.contact': 'Contact',
    'site.title': 'Maksim Tarasov, Frontend Developer',
    'site.description': 'Frontend Developer Portfolio',
    'footer.rights': 'All rights reserved',
    'intro.hi': 'Hello, my name is',
    'intro.name': 'Maksim Tarasov',
    'intro.description': 'I am a frontend developer passionate about web, accessibility, interfaces and eager to create the best UI and UX',
    'experience.description': 'Professional experience is mainly related to product development in a scrum team, namely:',
    'card.scale.title': 'Large-scale solutions',
    'card.scale.description': 'Development of an international multilingual product with more than 3,000,000 unique visitors per month',
    'card.improvement.title': 'Product improvement',
    'card.improvement.description': 'Refactoring and optimizing codebase, improving metrics and performance',
    'card.uikit.title': 'Custom ui-kit',
    'card.uikit.description_pre': 'Developed',
    'card.uikit.description': 'as a personal project within the company. Participation in design, development, documentation and integration into the company\'s flagship product',
    'card.development.title': 'Overall development',
    'card.development.description': 'Implementation of new tools and useful practices, optimization and process improvement',
    'card.teamwork.title': 'Teamwork',
    'card.teamwork.description': 'Active participation in various meetings, conducting code reviews, mentoring and helping team members',
  },
} as const;

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');

  if (lang in ui) return lang as keyof typeof ui;

  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
}
