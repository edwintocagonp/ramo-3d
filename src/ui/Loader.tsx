import { AnimatePresence, motion } from "motion/react";

import { BRAND } from "../content";
import { RoseMark } from "./icons";

export function Loader({ visible, gift }: { visible: boolean; gift: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="loader" exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          <RoseMark size={64} />
          <p className="loader__brand">{BRAND.name}</p>
          <p className="loader__sub">{gift ? "Alguien te envió flores" : "Cortando las rosas"}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
