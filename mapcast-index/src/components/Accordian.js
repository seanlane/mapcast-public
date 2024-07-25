import { useState } from 'react';

const Accordion = ({ entries }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="hs-accordion-group" data-hs-accordion-always-open="">
      {entries.map((item, index) => (
        <div
          key={index}
          className={`hs-accordion ${activeIndex === index ? 'active' : ''} bg-white border -mt-px first:rounded-t-lg last:rounded-b-lg`}
          id={`hs-bordered-heading-${index}`}
        >
          <button
            className={`hs-accordion-toggle ${
              activeIndex === index ? 'hs-accordion-active:text-blue-600 dark:hs-accordion-active:text-blue-500' : ''
            } inline-flex items-center gap-x-3 w-full font-semibold text-start text-gray-800 py-4 px-5 hover:text-gray-500 disabled:opacity-50 disabled:pointer-events-none`}
            aria-controls={`hs-basic-bordered-collapse-${index}`}
            onClick={() => toggleAccordion(index)}
          >
            <svg
              className={`${
                activeIndex === index ? 'hs-accordion-active:block' : 'block'
              } size-3.5`}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14"></path>
              {activeIndex !== index && <path d="M12 5v14"></path>}
            </svg>
            {item.title}
          </button>
          <div
            id={`hs-basic-bordered-collapse-${index}`}
            className={`hs-accordion-content ${
              activeIndex === index ? 'block' : 'hidden'
            } w-full overflow-hidden transition-[height] duration-300`}
            aria-labelledby={`hs-bordered-heading-${index}`}
          >
            <div className="pb-4 px-5">
              <p className="text-gray-800">{item.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Accordion;
