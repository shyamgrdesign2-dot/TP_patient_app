import s from "./MiraAvatar.module.css";
export default function MiraAvatar({ size = 24 }) {
  return (
    <img
      className={s.avatar}
      src="/collector/mira.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
    />
  );
}
