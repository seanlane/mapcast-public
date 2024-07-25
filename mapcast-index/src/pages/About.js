// src/pages/About.js
import React from 'react';
import Accordion from '../components/Accordian';

const About = () => {
  return (
    <div className="max-w-prose container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome to Mapcast</h1>
      <p className="mb-4">Let's play a game.</p>
      <p className="mb-4">
        Send HTTP requests to this web app from as many unique IP addresses in different areas of the world as you can to gain points and claim territory on behalf of a name. Points can be scored across each of the following geographical categories:
      </p>

      <ul className="list-disc list-inside mb-4">
        <li>country</li>
        <li>top-level administrative region (department/province/state)</li>
        <li>nearest<sup class="font-features sups">*</sup> <a href="https://www.cloudflare.com/network/" className="text-blue-500 underline">Cloudflare colocation facility</a> (colo)</li>
      </ul>

      <p className="mb-4">Valid endpoints to use for claiming are:</p>
      <ul className="list-disc list-inside mb-4">
        <li><code>https://w.mapcast.xyz/claim?name=abc</code></li>
        <li><code>https://w.mapcast.xyz/claim.gif?name=abc</code></li>
      </ul>
      <p className="mb-4">This is heavily inspired by <a href="http://IPv4.games" className="text-blue-500 underline">IPv4 Games (Turf War)</a>. Thanks to <a href="https://twitter.com/ClayLoam" className="text-blue-500 underline">ClayLoam</a> and <a href="https://twitter.com/justineTunney" className="text-blue-500 underline">Justine Tunney</a> for the inspiration.</p>
      
      <h2 className="text-2xl font-bold mb-4">What is Mapcast?</h2>
      <p className="mb-4">
        Mapcast is a portmanteau of "map" and <a href="https://www.cloudflare.com/learning/cdn/glossary/anycast-network/" className="text-blue-500 underline">"Anycast"</a>. From that link, "Anycast is a network addressing and routing method in which incoming requests can be routed to a variety of different locations or nodes." We're (ab)using it here for a game that's like Risk meets network engineering.
      </p>
      
      <h2 className="text-2xl font-bold mb-4">How Scoring Works</h2>
      <p className="mb-4">
        For each successful request, we record the submitted name, source IPv4 address or IPv6 /48 prefix, the <a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2" className="text-blue-500 underline">ISO 3166-1 alpha-2</a> country code<sup class="font-features sups">*</sup>, an <a href="https://en.wikipedia.org/wiki/ISO_3166-2" className="text-blue-500 underline">ISO 3166-2 region</a> code<sup class="font-features sups">*</sup>, and the Cloudflare colo that serviced the request.
      </p>
      <p className="mb-4">
        If a name claims more addresses from a particular country, region, or colo than any other, it controls that territory. Each controlled territory gives 1 point. Claims can expire based on selected time periods (<code>hourly</code>, <code>daily</code>, <code>weekly</code>, <code>monthly</code>, <code>all-time</code>), except for <code>all-time</code>. A claim for an existing IP address or prefix will overwrite any previous claim. Ties are broken by the most IPs claimed and then by the most recent claim.
      </p>
      
      <h2 className="text-2xl font-bold mb-4">Who made this?</h2>
      <p className="mb-4">This was a weekend<sup class="font-features sups">*</sup> project made by <a href="https://twitter.com/seantheolane" className="text-blue-500 underline">Sean Lane</a>.</p>
      
      <h2 className="text-2xl font-bold mb-4">How did you make this?</h2>
      <p className="mb-4">
        The frontend is built with React, Leaflet, Cloudflare Worker Pages, and other Javascript libraries. The backend is based on a few Cloudflare developer products: Workers, R2, and Cloudflare's global Anycast network. There's also a Python script that makes use of Polars and DuckDB to aggregate claims.
      </p>
      
      <h2 className="text-2xl font-bold mb-4">But...why?</h2>
      <p className="mb-4">
        Mostly, I thought it'd be cool. I originally was trying to create a DNS version of <a href="http://IPv4.games" className="text-blue-500 underline">IPv4 Games</a> (which came from my time working on AWS Route53), but the magic with the original site is the ease of starting. I figured getting people to play around with DNS records would be an uphill battle.
      </p>
        
      <p className="mb-4">Thoughts about DNS turned to Anycast DNS, then just Anycast, and then I started toying around with things. Using countries and regions turned out to be pretty interesting, since there seems to be more attachment to a region or area than an IPv4 block.
      </p>
      <p className="mb-4">
        It also was a chance to mess around with Cloudflare's great free plan, learn more about their Developer products, and do some frontend development with React.
      </p>
      
      <h2 className="text-2xl font-bold mb-4">Caveats</h2>
      <blockquote class="p-4 my-4 bg-gray-50 border-l-4 border-gray-300">
        <p class="text-xl italic font-medium leading-relaxed text-gray-900">There's a bunch of asterisks up above. What are you hiding?</p>
      </blockquote>

      <p className="mb-4">You caught me. Let's go through the list:</p>
      <ol className="list-decimal list-inside mb-4 pl-4">
        <li className="mb-2">Anycast routing can be unpredictable, since it's usually based on lowest latency which doesn't always equate to the physically closest colo. Using the free Cloudflare plan means a limited set of colos are actually used. If someone from Cloudflare reads this and wants to hook me up with an enterprise plan, let me know.</li>
        <li className="mb-2">Country codes <a href="https://developers.cloudflare.com/network/ip-geolocation/" className="text-blue-500 underline">are sourced from MaxMind and other sources</a> and may not be on every request.</li>
        <li className="mb-2">Same as the above, just for regions.</li>
        <li className="mb-2">Not actually a single weekend project—life happens.</li>
      </ol>

      <h2 className="text-2xl font-bold mb-4">Support Mapcast</h2>
      <p className="mb-4">If you'd like to support this project, please consider making a donation on <a href="https://github.com/sponsors/seanlane" className="text-blue-500 underline">GitHub</a>.</p>
      
      <h2 className="text-2xl font-bold mb-4">More Questions</h2>
      <Accordion entries={accordionData}/>
    </div>
  );
};

const accordionData = [
  {
    title: 'Can you handle the same load as IPv4.Games?',
    content: 'No.',
  },
  {
    title: 'Why not?',
    content: (
        <span>
            <p>
                IPv4.games has a terrifically optimized server, that can handle potentially hundreds of thousands of requests per second. My app on Cloudflare is probably physically capable of the same thing (thanks to Cloudflare, not anything I did), but my wallet is not. Ergo, there are rate limits in place to help mitigate some load for spamming, repetitive requests. The goal here is to make requests from different areas of the world, not a billion requests from the same two IPs. 
            </p>
            <br/>
            <p>
                If the demand skyrockets and I can source some funding, maybe we can look into it though.
            </p>
        </span>
    ),
  },
  {
    title: 'What could go wrong with this?',
    content: (
      <span>
        <p>
            Either no views or millions of requests exceeding free plan limits. If overwhelmed, I'll switch to a paid plan within reason. I can't tell my kids we can't afford food so Daddy can play Internet tag with imaginary friends.
        </p>
        <br/>
        <p>
            So, with that said, this service is operated and provided with absolutely no warranty or guarantee whatsoever. The state of California says it will probably give you cancer. When the Great War of 2077 commences, you are not guaranteed a spot in Vault 101 without written authorization from the Overseer. If you complain about this service, this notice, or anything pertaining to anything about this service, I'll have passive aggressive daydreams about you having mild inconveniences for the remainder of the week while telling you to have a nice day.
        </p>
        <br/>
        <p>
        You've been warned.
        </p>
      </span>
    ),
  },
  {
    title: 'Is the code open source?',
    content: (
      <span>
         Not yet. I'll probably unload it eventually. Once I'm not too ashamed of my React code. And worker code. And Python code. It's not pretty. But maybe it works?
      </span>
    ),
  },
  {
    title: 'My country/region of Foo-Bar is shown incorrectly on the map/attributed incorrectly on my request/etc.',
    content: (
      <span>
         <p>All information for maps and requests is sourced from freely available tools and services, and either stems from them or some mistake I made in aggregating things. The sources are:</p>
         <ul className="list-disc list-inside space-y-2 pl-4">
            <li>Request country and region codes: Cloudflare, MaxMind, and their other sources</li>
            <li>Map administrative boundaries: <a href="https://overturemaps.org/" className="text-blue-500 underline">Overture Maps</a></li>
            <li>No political, territorial, phantasmic, or any other -al or -ic statements are being made here. It's just a game, bro.</li>
        </ul>
      </span>
    ),
  },
  {
    title: 'This is very upsetting to me. Where can I submit a complaint?',
    content: (
      <span>
         Complaints are recorded using the state-of-the-art <a href="http://www.supersimplestorageservice.com/#api" className="text-blue-500 underline">Super Simple Storage Service API</a>. Write out a very thorough description of the issue (the more time spent detailing the issue, the better) and then upload it there. I'll get back to you as soon as I can.
      </span>
    ),
  },
  {
    title: 'I have some constructive feedback or thoughts, how can I reach out?',
    content: (
      <span>
        I can be found on <a href="https://twitter.com/seantheolane" className="text-blue-500 underline">Twitter</a>, <a href="https://github.com/seanlane" className="text-blue-500 underline">GitHub</a>, and the employment-flavored social media platform owned by Microsoft.
      </span>
    ),
  },
];

export default About;
