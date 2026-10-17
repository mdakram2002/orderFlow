import Link from "next/link";

export default function AboutPage() {
  return <>
    <section className="page-hero about-hero"><div><p className="eyebrow">A LITTLE ABOUT US</p><h1>Shopping should feel<br /><em>like finding something.</em></h1><p>Not another endless scroll. A collection of useful, thoughtful things that make the everyday feel a bit more yours.</p></div><div className="about-art"><span className="about-sun"/><span className="about-mark">o.</span><span className="about-art-caption">GOOD FINDS<br />GOOD FEELING</span></div></section>
    <section className="about-statement"><p className="eyebrow">WHY ORDERFLOW</p><h2>We make room for the<br />things that <em>matter.</em></h2><p>OrderFlow brings the convenience of online shopping together with a more considered point of view. We keep discovery simple, product details clear, and checkout easy—so you can spend less time looking and more time enjoying what you find.</p></section>
    <section className="values-grid"><article><span>01</span><h3>Useful by design</h3><p>Everyday essentials and little upgrades that earn their place in your home and routine.</p></article><article><span>02</span><h3>Simple from start to finish</h3><p>Browse, choose, and check out without the extra noise. Shopping should just work.</p></article><article><span>03</span><h3>Built around trust</h3><p>Clear prices, secure accounts, and order updates that help you know what’s happening.</p></article></section>
    <section className="about-cta"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Let’s find something good.</h2></div><Link className="button button-dark" href="/shop">Explore the shop <span>↗</span></Link></section>
  </>;
}
