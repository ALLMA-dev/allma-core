import React, { type ReactNode } from 'react';
import clsx from 'clsx';
//import Heading from '@theme/Heading';
//import styles from './styles.module.css';
//import SvgMountain from '@site/static/img/undraw_docusaurus_mountain.svg';
//import SvgTree from '@site/static/img/undraw_docusaurus_tree.svg';
//import SvgReact from '@site/static/img/undraw_docusaurus_react.svg';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};


export default function HomepageFeatures(): ReactNode {
  return (
    <section>
      <div className="container">
        <div className="row">

        </div>
      </div>
    </section>
  );
}
