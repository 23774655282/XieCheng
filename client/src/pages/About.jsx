import React from 'react';

/** 关于我们：易宿酒店预订平台介绍 */
function About() {
  return (
    <div className="pt-28 md:pt-36 px-4 md:px-16 lg:px-24 xl:px-32 pb-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">关于易宿酒店预订平台</h1>

        <section className="space-y-4 text-gray-700 leading-relaxed">
          <p>
            <strong>易宿酒店预订平台</strong>致力于为出行者提供简单、可信的酒店预订服务。无论您是商务出差还是休闲度假，我们精选的酒店与房型都能满足不同预算与需求。
          </p>
          <p>
            平台汇聚多城市优质酒店，支持按目的地搜索、按房型与价格筛选，并展示真实图片与设施信息。您可以在线完成预订、管理订单，享受透明价格与清晰退改政策。
          </p>
          <p>
            我们与酒店方紧密合作，确保房源真实可订；同时为酒店商户提供入驻与信息管理能力，助力更多好酒店触达旅客。易宿希望让每一次入住都更安心、更省心。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">我们的服务</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>多城市酒店搜索与比价</li>
            <li>房型、设施与图片详情展示</li>
            <li>在线预订与订单管理</li>
            <li>酒店商户入驻与信息维护</li>
          </ul>
        </section>

        <p className="mt-10 text-gray-500 text-sm">
          感谢您选择易宿酒店预订平台，祝您旅途愉快。
        </p>
      </div>
    </div>
  );
}

export default About;
