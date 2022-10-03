import { withSentryConfig } from '@sentry/nextjs';
import withLinkRoles from './rehype/withLinkRoles.js';
import { createLoader } from 'simple-functional-loader';
import frontMatter from 'front-matter';
import withSmartypants from 'remark-smartypants';
import withTableOfContents from './remark/withTableOfContents.js';
import withCodeBlocks from './rehype/withCodeBlocks.js';
import withNextLinks from './remark/withNextLinks.js';
import withFrames from './remark/withFrames.js';
import withImportsInjected from './remark/withImportsInjected.js';
import BundleAnalyzer from '@next/bundle-analyzer';
import remarkGfm from 'remark-gfm';
import withStaticProps from './rehype/withStaticProps.js';
import withApiComponents from './rehype/withApiComponents.js';
import mintConfig from './src/config.json' assert { type: 'json' };
import withSyntaxHighlighting from './rehype/withSyntaxHighlighting.js';
import withLayouts from './rehype/withLayouts.js';
import { potentiallyRemoveEndMatter } from './prebuild/injectNav.js';
import path from 'path';
import fs from 'fs';
import { getParentPath } from '@grouparoo/core/dist/modules/pluginDetails.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function getPluginPath(pluginName) {
  const p = path.join(
    path.dirname(require.resolve(`${pluginName}/package.json`)),
    '..',
    pluginName
  );
  return p;
}

const envFile = path.resolve(path.join(getParentPath(), '.env'));
if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
}

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const sentryWebpackPluginOptions = {
  // Suppresses all logs
  silent: true,

  // Disable sentry builds when we don't have a sentry auth token.
  // Sites have to be manually added to our Sentry tracking so by default
  // new customers' sites will not have an auth token set.
  dryRun: process.env.VERCEL_ENV !== 'production' || !process.env.SENTRY_AUTH_TOKEN,
};

export default withSentryConfig(
  withBundleAnalyzer({
    env: {
      GROUPAROO_UI_EDITION: 'config',
    },
    productionBrowserSourceMaps: true,
    swcMinify: true,
    pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx', 'md'],
    images: {
      disableStaticImages: true,
    },
    basePath: mintConfig?.basePath,
    webpack(config, options) {
      // There may be different version of these core packages in our dependency tree.  We need to pick only one version (our version).
      ['react', 'react-dom', 'next'].forEach((_package) => {
        config.resolve.alias[_package] = getPluginPath(_package);
      });
      config.module.rules.push({
        test: /\.(png|jpe?g|gif|webp|avif|mp4)$/i,
        issuer: /\.(jsx?|tsx?|mdx?)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              publicPath: '/_next',
              name: 'static/media/[name].[hash].[ext]',
            },
          },
        ],
      });
      config.module.rules.push({
        test: /grouparoo\/ui*\/.*.ts$|grouparoo\/ui*\/.*.tsx$/,
        use: [options.defaultLoaders.babel],
      });

      config.module.rules.push({
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: { svgoConfig: { plugins: { removeViewBox: false } } },
          },
          {
            loader: 'file-loader',
            options: {
              publicPath: '/_next',
              name: 'static/media/[name].[hash].[ext]',
            },
          },
        ],
      });

      config.module.rules.push({
        test: { and: [/\.mdx$/, /snippets/] },
        use: [
          options.defaultLoaders.babel,
          {
            loader: '@mdx-js/loader',
            options: {
              providerImportSource: '@mdx-js/react',
              remarkPlugins: [
                remarkGfm,
                withImportsInjected,
                withFrames,
                withNextLinks,
                withSmartypants,
              ],
              rehypePlugins: [
                [
                  withSyntaxHighlighting,
                  {
                    ignoreMissing: true,
                  },
                ],
                withCodeBlocks,
                withLinkRoles,
              ],
            },
          },
        ],
      });

      config.module.rules.push({
        test: { and: [/\.mdx?$/], not: [/snippets/] },
        use: [
          options.defaultLoaders.babel,
          {
            loader: '@mdx-js/loader',
            options: {
              providerImportSource: '@mdx-js/react',
              remarkPlugins: [
                remarkGfm,
                withImportsInjected,
                withFrames,
                withTableOfContents,
                withNextLinks,
                withSmartypants,
              ],
              rehypePlugins: [
                [
                  withSyntaxHighlighting,
                  {
                    ignoreMissing: true,
                  },
                ],
                withCodeBlocks,
                withLinkRoles,
                withApiComponents,
                [
                  withStaticProps,
                  `{
                    isMdx: true
                  }`,
                ],
                withLayouts,
              ],
            },
          },
          createLoader(function (source) {
            const { body } = frontMatter(source);
            return potentiallyRemoveEndMatter(body);
          }),
        ],
      });
      return config;
    },
  }),
  sentryWebpackPluginOptions
);
