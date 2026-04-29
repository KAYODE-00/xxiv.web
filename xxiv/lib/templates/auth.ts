import { BlockTemplate } from '@/types';
import { getTemplateRef } from '@/lib/templates/blocks';
import { createDynamicTextVariable, createStaticTextVariable } from '@/lib/variable-utils';

export const authTemplates: Record<string, BlockTemplate> = {
  'auth-login-form': {
    icon: 'form',
    name: 'Login Form',
    template: {
      name: 'div',
      customName: 'Login form',
      classes: ['flex', 'flex-col', 'gap-4', 'w-full', 'max-w-[420px]'],
      settings: {
        customAttributes: {
          'data-xxiv-auth': 'login',
        },
      },
      children: [
        getTemplateRef('text', {
          customName: 'Heading',
          variables: { text: createStaticTextVariable('Member login') },
        }),
        { name: 'input', attributes: { type: 'email', placeholder: 'Email' }, classes: ['w-full', 'rounded-[12px]', 'border', 'border-white/15', 'bg-black/10', 'px-[16px]', 'py-[12px]'] },
        { name: 'input', attributes: { type: 'password', placeholder: 'Password' }, classes: ['w-full', 'rounded-[12px]', 'border', 'border-white/15', 'bg-black/10', 'px-[16px]', 'py-[12px]'] },
        {
          name: 'button',
          classes: ['rounded-[12px]', 'bg-black', 'px-[18px]', 'py-[12px]', 'text-white'],
          settings: { customAttributes: { 'data-xxiv-auth': 'login-submit' } },
          variables: { text: createStaticTextVariable('Log in') },
        },
        {
          name: 'a',
          classes: ['text-[14px]'],
          attributes: { href: '/xxiv-auth/forgot-password' },
          variables: { text: createDynamicTextVariable('Forgot password?') },
        },
      ],
    },
  },
  'auth-signup-form': {
    icon: 'plus-circle',
    name: 'Signup Form',
    template: {
      name: 'div',
      customName: 'Signup form',
      classes: ['flex', 'flex-col', 'gap-4', 'w-full', 'max-w-[420px]'],
      settings: {
        customAttributes: {
          'data-xxiv-auth': 'signup',
        },
      },
      children: [
        getTemplateRef('text', {
          customName: 'Heading',
          variables: { text: createStaticTextVariable('Create account') },
        }),
        { name: 'input', attributes: { type: 'text', placeholder: 'Full name' }, classes: ['w-full', 'rounded-[12px]', 'border', 'border-white/15', 'bg-black/10', 'px-[16px]', 'py-[12px]'] },
        { name: 'input', attributes: { type: 'email', placeholder: 'Email' }, classes: ['w-full', 'rounded-[12px]', 'border', 'border-white/15', 'bg-black/10', 'px-[16px]', 'py-[12px]'] },
        { name: 'input', attributes: { type: 'password', placeholder: 'Password' }, classes: ['w-full', 'rounded-[12px]', 'border', 'border-white/15', 'bg-black/10', 'px-[16px]', 'py-[12px]'] },
        {
          name: 'button',
          classes: ['rounded-[12px]', 'bg-black', 'px-[18px]', 'py-[12px]', 'text-white'],
          variables: { text: createStaticTextVariable('Sign up') },
        },
        {
          name: 'a',
          classes: ['text-[14px]'],
          attributes: { href: '/xxiv-auth/login' },
          variables: { text: createDynamicTextVariable('Already have an account?') },
        },
      ],
    },
  },
  'auth-user-greeting': {
    icon: 'text',
    name: 'User Greeting',
    template: {
      name: 'div',
      customName: 'User greeting',
      classes: ['text-[16px]'],
      settings: { customAttributes: { 'data-xxiv-auth': 'user-greeting' } },
      variables: { text: createStaticTextVariable('Welcome') },
    },
  },
  'auth-logout-btn': {
    icon: 'arrow-right',
    name: 'Sign Out Element',
    template: {
      name: 'button',
      customName: 'Sign out element',
      classes: ['rounded-[12px]', 'bg-black', 'px-[18px]', 'py-[12px]', 'text-white'],
      settings: { customAttributes: { 'data-xxiv-auth': 'logout' } },
      variables: { text: createStaticTextVariable('Sign out') },
    },
  },
  'auth-members-only': {
    icon: 'component',
    name: 'Members Only',
    template: {
      name: 'div',
      customName: 'Members only',
      classes: ['rounded-[20px]', 'border', 'border-white/10', 'p-[24px]'],
      settings: { customAttributes: { 'data-xxiv-auth': 'members-only' } },
      children: [
        getTemplateRef('text', {
          customName: 'Content',
          variables: { text: createStaticTextVariable('Members-only content') },
        }),
      ],
    },
  },
};
