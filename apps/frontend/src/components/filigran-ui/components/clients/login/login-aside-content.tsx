'use client';

import * as React from 'react';

const FiligranLogoDark = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="851"
    height="852"
    viewBox="0 0 851 852"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M133.788 202.15C82.5992 267.824 52.0346 350.054 52.1517 438.426C52.2688 526.798 83.0487 606.977 134.407 669.222L133.788 202.15ZM185.869 147.172L186.629 720.713C211.044 740.286 238.096 756.715 267.195 769.431L266.298 93.0721C237.236 107.732 210.23 125.968 185.869 147.172ZM318.423 71.4255L319.372 787.59C345.157 794.396 372.104 798.453 399.883 799.442L398.896 54.191C371.122 57.0373 344.188 62.8959 318.423 71.4255ZM451.047 52.4472L451.155 134.204L659.309 127.245C601.527 82.5832 529.614 55.2438 451.047 52.4472ZM712.312 177.655L451.224 186.384L451.331 266.977L763.581 256.538C749.934 227.888 732.649 201.404 712.312 177.655ZM783.419 308.057L451.4 319.157L451.507 399.698L797.899 388.117C795.999 360.39 791.062 333.597 783.419 308.057ZM797.87 440.3L451.576 451.878L452.034 797.699C481.161 794.714 509.363 788.417 536.262 779.2L535.936 532.849L782.293 524.612C790.538 497.568 795.855 469.335 797.87 440.3ZM761.78 577.48L588.156 583.285L588.22 631.407L640.372 629.664L640.441 681.844L588.289 683.587L588.386 756.899C663.933 717.751 725.234 654.318 761.78 577.48ZM0.000654596 440.17C-0.310906 205.06 189.924 8.09812 424.902 0.241967C659.88-7.61419 850.62 176.611 850.932 411.72C851.243 646.829 661.008 843.791 426.03 851.648C191.052 859.504 0.312216 675.279 0.000654596 440.17Z"
      fill="url(#filigran_dark_gradient)"
    />
    <defs>
      <linearGradient
        id="filigran_dark_gradient"
        x1="-0.563477"
        y1="14.4668"
        x2="968.255"
        y2="188.89"
        gradientUnits="userSpaceOnUse">
        <stop stopColor="#0C1524" />
        <stop
          offset="1"
          stopColor="#070D19"
        />
      </linearGradient>
    </defs>
  </svg>
);
FiligranLogoDark.displayName = 'FiligranLogoDark';

const FiligranLogoLight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="804"
    height="797"
    viewBox="0 0 804 797"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M133.788 175.037C82.5992 240.711 52.0346 322.941 52.1517 411.313C52.2688 499.685 83.0487 579.863 134.407 642.109L133.788 175.037ZM185.869 120.059L186.629 693.6C211.044 713.173 238.096 729.602 267.195 742.317L266.298 65.9588C237.236 80.6188 210.23 98.8548 185.869 120.059ZM318.423 44.3122L319.372 760.477C345.157 767.283 372.104 771.34 399.883 772.329L398.896 27.0777C371.122 29.924 344.188 35.7826 318.423 44.3122ZM451.047 25.3339L451.155 107.091L659.309 100.132C601.527 55.47 529.614 28.1306 451.047 25.3339ZM712.312 150.542L451.224 159.271L451.331 239.864L763.581 229.424C749.934 200.774 732.649 174.291 712.312 150.542ZM783.419 280.944L451.4 292.044L451.507 372.585L797.899 361.004C795.999 333.277 791.062 306.484 783.419 280.944ZM797.87 413.187L451.576 424.765L452.034 770.586C481.161 767.601 509.363 761.303 536.262 752.087L535.936 505.735L782.293 497.499C790.538 470.455 795.855 442.222 797.87 413.187ZM761.78 550.367L588.156 556.172L588.22 604.294L640.372 602.55L640.441 654.73L588.289 656.474L588.386 729.786C663.933 690.637 725.234 627.204 761.78 550.367ZM0.000654596 413.056C-0.310906 177.947 189.924-19.0152 424.902-26.8713C659.88-34.7275 850.62 149.497 850.932 384.607C851.243 619.716 661.008 816.678 426.03 824.534C191.052 832.39 0.312216 648.165 0.000654596 413.056Z"
      fill="url(#filigran_light_gradient)"
    />
    <defs>
      <linearGradient
        id="filigran_light_gradient"
        x1="-0.563477"
        y1="-12.6465"
        x2="968.255"
        y2="161.777"
        gradientUnits="userSpaceOnUse">
        <stop stopColor="#F7F7F7" />
        <stop
          offset="1"
          stopColor="#ECECF2"
        />
      </linearGradient>
    </defs>
  </svg>
);
FiligranLogoLight.displayName = 'FiligranLogoLight';

const LoginAsideDefaultContent = () => (
  <>
    <FiligranLogoDark
      className="pointer-events-none absolute hidden select-none dark:block"
      style={{
        height: 'calc(100% + 80px)',
        width: 'auto',
        top: '-40px',
        right: '-40px',
      }}
    />
    <FiligranLogoLight
      className="pointer-events-none absolute block select-none dark:hidden"
      style={{
        height: 'calc(100% + 80px)',
        width: 'auto',
        top: '-40px',
        right: '-40px',
      }}
    />
  </>
);
LoginAsideDefaultContent.displayName = 'LoginAsideDefaultContent';

export { FiligranLogoDark, FiligranLogoLight, LoginAsideDefaultContent };
