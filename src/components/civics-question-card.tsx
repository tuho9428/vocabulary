import type { RefObject } from "react";
import type { StudyItem } from "@/lib/types";

function AudioButton({text,recording,label,onPlay}:{text:string;recording?:string;label:string;onPlay:(text:string,recording?:string)=>void}) {
  return <button type="button" className="audio-button" onClick={()=>onPlay(text,recording)}><span aria-hidden="true" className="speaker">♪</span>{label}</button>;
}
export function CivicsQuestionCard({item,revealed,heading,onPlay,onReveal,onContinue}: {
  item:StudyItem;revealed:boolean;heading:RefObject<HTMLHeadingElement|null>;
  onPlay:(text:string,recording?:string)=>void;onReveal:()=>void;onContinue:()=>void;
}) {
  const answers=item.answers ?? (item.answer?.trim()?[item.answer]:[]);
  return <section className="study-card practice-card">
    <span className="sample-tag">USCIS {item.sourceVersion} · Câu {item.questionId} · {item.sourceRevision}</span>
    <p className="quiet">Bạn nghe và thử trả lời câu hỏi nhé.</p>
    <h1 ref={heading} tabIndex={-1} lang="en">{item.question}</h1>
    {item.questionVietnamese && <p className="question-translation">{item.questionVietnamese}</p>}
    <AudioButton text={item.question!} recording={item.questionAudio} label="Nghe câu hỏi" onPlay={onPlay} />
    {revealed ? <div className="answer-area" aria-live="polite"><p className="eyebrow">CÂU TRẢ LỜI</p>
      {answers.length ? <>
        {answers.map((answer,index)=><h2 lang="en" key={index}>{answer}</h2>)}
        <AudioButton text={answers.join(" ")} recording={item.answerAudio} label="Nghe câu trả lời" onPlay={onPlay} />
        {item.answersVietnamese?.map((translation,index)=><p className="answer-translation" key={index}>{translation}</p>)}
        {item.answerSourceId && <p className="field-help">Đáp án từ bộ dữ liệu gia đình · {item.answerSourceId}{item.answerSourceVersion==="unspecified" ? " · Nguồn chưa ghi phiên bản đề" : ` · Bộ ${item.answerSourceVersion}`}</p>}
      </> : <p className="field-help">{item.answerStatus==="unmatched" ? "Chưa tìm thấy câu hỏi này trong bộ câu hỏi có đáp án được cung cấp." : "Nguồn dữ liệu chưa có câu trả lời tiếng Anh cho câu hỏi này."} Bạn có thể xem tài liệu USCIS.</p>}
      <a href={item.source} target="_blank" rel="noreferrer">Xem tài liệu USCIS ↗</a>
      <button className="primary" onClick={onContinue}>Đã luyện tập, tiếp tục <span aria-hidden="true">→</span></button>
    </div> : <button className="primary" onClick={onReveal}>Hiện đáp án</button>}
  </section>;
}
