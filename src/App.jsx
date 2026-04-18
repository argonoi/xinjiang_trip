import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STORAGE_KEY = "shared_trip_wallet_groups";
const LEGACY_STORAGE_KEYS = [
  "shared_trip_wallet_groups",
  "shared_trip_wallet_groups_v2",
  "shared_trip_wallet_groups_mobile_v1",
];

const CATEGORY_OPTIONS = ["机票", "酒店", "吃饭", "娱乐", "其他"];
const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

function App() {
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupSize, setGroupSize] = useState(9);
  const [nameInputs, setNameInputs] = useState(Array(9).fill(""));
  const [groupPassword, setGroupPassword] = useState("");

  const [adminPasswordInput, setAdminPasswordInput] = useState("");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositPersonIds, setDepositPersonIds] = useState([]);

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("吃饭");
  const [expenseParticipantIds, setExpenseParticipantIds] = useState([]);
  const [expenseNote, setExpenseNote] = useState("");

  const [selectedPersonId, setSelectedPersonId] = useState(null);

  useEffect(() => {
    try {
      let loadedGroups = [];

      for (const key of LEGACY_STORAGE_KEYS) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length >= 0) {
            loadedGroups = normalizeGroups(parsed);
            if (loadedGroups.length > 0 || raw === "[]") {
              break;
            }
          }
        } catch (error) {
          console.error(`Failed to parse storage key ${key}:`, error);
        }
      }

      setGroups(loadedGroups);

      if (loadedGroups.length > 0) {
        setActiveGroupId(loadedGroups[0].id);
        setSelectedPersonId(loadedGroups[0].people?.[0]?.id ?? null);
      }
    } finally {
      setHasLoadedStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  }, [groups, hasLoadedStorage]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  const people = activeGroup?.people || [];
  const deposits = activeGroup?.deposits || [];
  const expenses = activeGroup?.expenses || [];
  const isAdminMode = Boolean(activeGroup?.isAdminMode);

  function updateActiveGroup(updater) {
    if (!activeGroupId) return;

    setGroups((prev) =>
      prev.map((group) =>
        group.id === activeGroupId ? normalizeGroup(updater(group)) : group
      )
    );
  }

  function resetCreateForm() {
    setGroupName("");
    setGroupSize(9);
    setNameInputs(Array(9).fill(""));
    setGroupPassword("");
  }

  function handleGroupSizeChange(value) {
    const size = Math.max(1, Number(value) || 1);
    setGroupSize(size);

    setNameInputs((prev) => {
      if (size > prev.length) {
        return [...prev, ...Array(size - prev.length).fill("")];
      }
      return prev.slice(0, size);
    });
  }

  function handleNameChange(index, value) {
    setNameInputs((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  function handleCreateGroup() {
    const size = Math.max(1, Number(groupSize) || 1);

    const createdPeople = Array.from({ length: size }, (_, index) => ({
      id: createId(),
      name: nameInputs[index]?.trim() || `Person ${index + 1}`,
    }));

    const newGroup = normalizeGroup({
      id: createId(),
      name: groupName.trim() || `Trip ${groups.length + 1}`,
      adminPassword: groupPassword.trim(),
      isAdminMode: false,
      people: createdPeople,
      deposits: [],
      expenses: [],
      createdAt: new Date().toISOString(),
    });

    setGroups((prev) => [newGroup, ...prev]);
    setActiveGroupId(newGroup.id);
    setSelectedPersonId(newGroup.people[0]?.id ?? null);

    setDepositAmount("");
    setExpenseAmount("");
    setExpenseNote("");
    setDepositPersonIds([]);
    setExpenseParticipantIds([]);
    setAdminPasswordInput("");
    resetCreateForm();
  }

  function handleOpenGroup(groupId) {
    const target = groups.find((group) => group.id === groupId);
    if (!target) return;

    setActiveGroupId(groupId);
    setSelectedPersonId(target.people?.[0]?.id ?? null);

    setDepositAmount("");
    setExpenseAmount("");
    setExpenseNote("");
    setDepositPersonIds([]);
    setExpenseParticipantIds([]);
    setAdminPasswordInput("");
  }

  function handleDeleteGroup(groupId) {
    const target = groups.find((group) => group.id === groupId);
    if (!target) return;

    if (activeGroupId !== groupId || !isAdminMode) {
      window.alert("Only Admin Mode of the currently opened group can delete it.");
      return;
    }

    const confirmed = window.confirm(`确定要删除 group “${target.name}” 吗？`);
    if (!confirmed) return;

    const remaining = groups.filter((group) => group.id !== groupId);
    setGroups(remaining);

    if (remaining.length > 0) {
      setActiveGroupId(remaining[0].id);
      setSelectedPersonId(remaining[0].people?.[0]?.id ?? null);
    } else {
      setActiveGroupId(null);
      setSelectedPersonId(null);
    }

    setDepositPersonIds([]);
    setExpenseParticipantIds([]);
    setAdminPasswordInput("");
  }

  function handleEnterAdminMode() {
    if (!activeGroup) return;

    if ((activeGroup.adminPassword || "") === adminPasswordInput) {
      updateActiveGroup((group) => ({
        ...group,
        isAdminMode: true,
      }));
      setAdminPasswordInput("");
    } else {
      window.alert("密码不对。");
    }
  }

  function handleExitAdminMode() {
    updateActiveGroup((group) => ({
      ...group,
      isAdminMode: false,
    }));
  }

  function toggleSelection(currentIds, setter, id) {
    setter((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAllDepositors() {
    setDepositPersonIds(people.map((person) => person.id));
  }

  function handleClearAllDepositors() {
    setDepositPersonIds([]);
  }

  function handleSelectAllExpenseParticipants() {
    setExpenseParticipantIds(people.map((person) => person.id));
  }

  function handleClearAllExpenseParticipants() {
    setExpenseParticipantIds([]);
  }

  function handleAddDeposit() {
    if (!activeGroup || !isAdminMode) {
      window.alert("Please enter Admin Mode first.");
      return;
    }

    const amount = Number(depositAmount);
    if (amount <= 0) {
      window.alert("请输入正确的 deposit 金额。");
      return;
    }

    if (depositPersonIds.length === 0) {
      window.alert("请至少选择一个人。");
      return;
    }

    const newDeposits = depositPersonIds.map((personId) => ({
      id: createId(),
      type: "deposit",
      personId,
      amount,
      createdAt: new Date().toISOString(),
    }));

    updateActiveGroup((group) => ({
      ...group,
      deposits: [...group.deposits, ...newDeposits],
    }));

    setDepositAmount("");
    setDepositPersonIds([]);
  }

  function handleAddExpense() {
    if (!activeGroup || !isAdminMode) {
      window.alert("Please enter Admin Mode first.");
      return;
    }

    const amount = Number(expenseAmount);
    if (amount <= 0) {
      window.alert("请输入正确的 expense 金额。");
      return;
    }

    if (expenseParticipantIds.length === 0) {
      window.alert("请至少选择一个人。");
      return;
    }

    const newExpense = {
      id: createId(),
      type: "expense",
      category: expenseCategory,
      amount,
      participantIds: [...expenseParticipantIds],
      note: expenseNote.trim(),
      createdAt: new Date().toISOString(),
    };

    updateActiveGroup((group) => ({
      ...group,
      expenses: [...group.expenses, newExpense],
    }));

    setExpenseAmount("");
    setExpenseCategory("吃饭");
    setExpenseParticipantIds([]);
    setExpenseNote("");
  }

  function handleDeleteDeposit(depositId) {
    if (!isAdminMode) {
      window.alert("Only Admin Mode can delete records.");
      return;
    }

    if (!window.confirm("确定删除这笔 deposit 吗？")) return;

    updateActiveGroup((group) => ({
      ...group,
      deposits: group.deposits.filter((deposit) => deposit.id !== depositId),
    }));
  }

  function handleDeleteExpense(expenseId) {
    if (!isAdminMode) {
      window.alert("Only Admin Mode can delete records.");
      return;
    }

    if (!window.confirm("确定删除这笔 expense 吗？")) return;

    updateActiveGroup((group) => ({
      ...group,
      expenses: group.expenses.filter((expense) => expense.id !== expenseId),
    }));
  }

  const personBalances = useMemo(() => {
    const depositMap = {};
    const expenseMap = {};

    for (const person of people) {
      depositMap[person.id] = 0;
      expenseMap[person.id] = 0;
    }

    for (const deposit of deposits) {
      depositMap[deposit.personId] =
        (depositMap[deposit.personId] || 0) + Number(deposit.amount || 0);
    }

    for (const expense of expenses) {
      const participants = expense.participantIds || [];
      if (participants.length === 0) continue;

      const split = Number(expense.amount || 0) / participants.length;
      for (const participantId of participants) {
        expenseMap[participantId] = (expenseMap[participantId] || 0) + split;
      }
    }

    return people.map((person) => ({
      ...person,
      deposited: depositMap[person.id] || 0,
      spent: expenseMap[person.id] || 0,
      balance: (depositMap[person.id] || 0) - (expenseMap[person.id] || 0),
    }));
  }, [people, deposits, expenses]);

  const selectedPerson =
    personBalances.find((person) => person.id === selectedPersonId) ||
    personBalances[0] ||
    null;

  const selectedPersonRecords = useMemo(() => {
    if (!selectedPerson) return [];

    const personDeposits = deposits
      .filter((deposit) => deposit.personId === selectedPerson.id)
      .map((deposit) => ({
        id: deposit.id,
        createdAt: deposit.createdAt,
        displayType: "Deposit",
        amount: Number(deposit.amount || 0),
        detail: `${selectedPerson.name} 转入`,
      }));

    const personExpenses = expenses
      .filter((expense) => (expense.participantIds || []).includes(selectedPerson.id))
      .map((expense) => ({
        id: expense.id,
        createdAt: expense.createdAt,
        displayType: "Expense",
        amount: Number(expense.amount || 0) / expense.participantIds.length,
        detail: `${expense.category}${expense.note ? ` · ${expense.note}` : ""}`,
      }));

    return [...personDeposits, ...personExpenses].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [selectedPerson, deposits, expenses]);

  const pieData = useMemo(() => {
    return CATEGORY_OPTIONS.map((category) => {
      const total = expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      return { name: category, value: total };
    }).filter((item) => item.value > 0);
  }, [expenses]);

  const totalExpenseAmount = pieData.reduce((sum, item) => sum + item.value, 0);

  const allRecords = useMemo(() => {
    const depositRecords = deposits.map((deposit) => {
      const person = people.find((item) => item.id === deposit.personId);
      return {
        id: deposit.id,
        createdAt: deposit.createdAt,
        type: "Deposit",
        category: "-",
        totalAmount: Number(deposit.amount || 0),
        perPersonAmount: Number(deposit.amount || 0),
        participants: person ? [person.name] : [],
        note: "",
      };
    });

    const expenseRecords = expenses.map((expense) => {
      const participantNames = (expense.participantIds || [])
        .map((id) => people.find((person) => person.id === id)?.name)
        .filter(Boolean);

      return {
        id: expense.id,
        createdAt: expense.createdAt,
        type: "Expense",
        category: expense.category,
        totalAmount: Number(expense.amount || 0),
        perPersonAmount:
          (expense.participantIds || []).length > 0
            ? Number(expense.amount || 0) / expense.participantIds.length
            : 0,
        participants: participantNames,
        note: expense.note || "",
      };
    });

    return [...depositRecords, ...expenseRecords].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [deposits, expenses, people]);

  function exportCsv() {
    if (!activeGroup) return;

    const rows = [
      [
        "group_name",
        "timestamp",
        "type",
        "category",
        "total_amount_rmb",
        "per_person_amount_rmb",
        "participants",
        "note",
      ],
      ...allRecords.map((record) => [
        activeGroup.name,
        formatDate(record.createdAt),
        record.type,
        record.category,
        record.totalAmount.toFixed(2),
        record.perPersonAmount.toFixed(2),
        record.participants.join(" | "),
        record.note,
      ]),
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(activeGroup.name || "group").replace(/\s+/g, "_")}_records.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{responsiveStyles}</style>

      <div style={styles.page}>
        <div style={styles.wrapper}>
          <header style={styles.header}>
            <div>
              <h1 style={styles.title}>Shared Trip Wallet</h1>
              <p style={styles.subtitle}>
                Mobile-friendly local version. Realtime comes next.
              </p>
            </div>

            {activeGroup ? (
              <div
                style={{
                  ...styles.modeBadge,
                  background: isAdminMode ? "#fde68a" : "#dbeafe",
                }}
              >
                {isAdminMode ? "Admin Mode" : "View Mode"}
              </div>
            ) : null}
          </header>

          <div className="top-grid" style={styles.topGrid}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Create Group</h2>

              <label style={styles.label}>Group name</label>
              <input
                style={styles.input}
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="e.g. Xinjiang Trip"
              />

              <label style={styles.label}>Number of people</label>
              <input
                style={styles.input}
                type="number"
                min="1"
                value={groupSize}
                onChange={(event) => handleGroupSizeChange(event.target.value)}
              />

              <label style={styles.label}>Admin password</label>
              <input
                style={styles.input}
                type="password"
                value={groupPassword}
                onChange={(event) => setGroupPassword(event.target.value)}
                placeholder="每个 group 单独设置"
              />

              <div style={{ marginTop: 12 }}>
                <div style={styles.label}>Names</div>
                <div style={styles.nameList}>
                  {nameInputs.slice(0, groupSize).map((name, index) => (
                    <input
                      key={index}
                      style={styles.input}
                      value={name}
                      onChange={(event) =>
                        handleNameChange(index, event.target.value)
                      }
                      placeholder={`Person ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <button style={styles.primaryButton} onClick={handleCreateGroup}>
                Create Group
              </button>
            </section>

            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Saved Groups</h2>

              {groups.length === 0 ? (
                <p style={styles.emptyText}>No saved groups yet.</p>
              ) : (
                <div style={styles.savedGroupList}>
                  {groups.map((group) => {
                    const canDeleteThisGroup =
                      isAdminMode && activeGroupId === group.id;

                    return (
                      <div
                        key={group.id}
                        style={{
                          ...styles.savedGroupItem,
                          border:
                            group.id === activeGroupId
                              ? "2px solid #6366f1"
                              : "1px solid #e5e7eb",
                        }}
                      >
                        <div>
                          <div style={styles.savedGroupName}>{group.name}</div>
                          <div style={styles.savedGroupMeta}>
                            {group.people.length} people
                          </div>
                        </div>

                        <div style={styles.savedGroupActions}>
                          <button
                            style={styles.secondaryButton}
                            onClick={() => handleOpenGroup(group.id)}
                          >
                            Open
                          </button>
                          <button
                            style={{
                              ...styles.dangerButton,
                              opacity: canDeleteThisGroup ? 1 : 0.5,
                              cursor: canDeleteThisGroup ? "pointer" : "not-allowed",
                            }}
                            onClick={() => {
                              if (!canDeleteThisGroup) {
                                window.alert(
                                  "Open this group and enter Admin Mode before deleting it."
                                );
                                return;
                              }
                              handleDeleteGroup(group.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {!activeGroup ? (
            <section style={styles.card}>
              <p style={styles.emptyText}>Create or open a group to continue.</p>
            </section>
          ) : (
            <>
              <section style={styles.card}>
                <div className="section-header-row" style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={styles.cardTitle}>{activeGroup.name}</h2>
                    <p style={styles.sectionSubtitle}>
                      Everyone can view. Only Admin Mode can edit.
                    </p>
                  </div>

                  <div className="admin-controls" style={styles.adminControls}>
                    {isAdminMode ? (
                      <button
                        style={styles.secondaryButton}
                        onClick={handleExitAdminMode}
                      >
                        Exit Admin Mode
                      </button>
                    ) : (
                      <>
                        <input
                          style={{ ...styles.input, minWidth: 180 }}
                          type="password"
                          value={adminPasswordInput}
                          onChange={(event) =>
                            setAdminPasswordInput(event.target.value)
                          }
                          placeholder="Enter admin password"
                        />
                        <button
                          style={styles.primaryButtonCompact}
                          onClick={handleEnterAdminMode}
                        >
                          Enter Admin Mode
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </section>

              <div className="form-grid" style={styles.formGrid}>
                <section style={styles.card}>
                  <h2 style={styles.cardTitle}>Add Deposit</h2>

                  <label style={styles.label}>Amount (RMB)</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="0"
                    value={depositAmount}
                    onChange={(event) => setDepositAmount(event.target.value)}
                    placeholder="e.g. 10000"
                    disabled={!isAdminMode}
                  />

                  <div style={styles.selectionHeader}>
                    <span style={styles.label}>Participants</span>
                    <div style={styles.inlineActions}>
                      <button
                        style={styles.miniButton}
                        onClick={handleSelectAllDepositors}
                        disabled={!isAdminMode}
                      >
                        Select All
                      </button>
                      <button
                        style={styles.miniButton}
                        onClick={handleClearAllDepositors}
                        disabled={!isAdminMode}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="pill-grid" style={styles.personPillGrid}>
                    {people.map((person) => {
                      const selected = depositPersonIds.includes(person.id);

                      return (
                        <button
                          key={person.id}
                          type="button"
                          style={{
                            ...styles.personPill,
                            background: selected ? "#e0e7ff" : "#f9fafb",
                            borderColor: selected ? "#6366f1" : "#d1d5db",
                          }}
                          onClick={() =>
                            toggleSelection(
                              depositPersonIds,
                              setDepositPersonIds,
                              person.id
                            )
                          }
                          disabled={!isAdminMode}
                        >
                          {person.name}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    style={{
                      ...styles.primaryButton,
                      opacity: isAdminMode ? 1 : 0.6,
                    }}
                    onClick={handleAddDeposit}
                    disabled={!isAdminMode}
                  >
                    Add Deposit
                  </button>
                </section>

                <section style={styles.card}>
                  <h2 style={styles.cardTitle}>Add Expense</h2>

                  <label style={styles.label}>Amount (RMB)</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="0"
                    value={expenseAmount}
                    onChange={(event) => setExpenseAmount(event.target.value)}
                    placeholder="e.g. 1200"
                    disabled={!isAdminMode}
                  />

                  <label style={styles.label}>Category</label>
                  <select
                    style={styles.input}
                    value={expenseCategory}
                    onChange={(event) => setExpenseCategory(event.target.value)}
                    disabled={!isAdminMode}
                  >
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <label style={styles.label}>Note</label>
                  <input
                    style={styles.input}
                    value={expenseNote}
                    onChange={(event) => setExpenseNote(event.target.value)}
                    placeholder="e.g. 海底捞 / 滴滴 / 门票"
                    disabled={!isAdminMode}
                  />

                  <div style={styles.selectionHeader}>
                    <span style={styles.label}>Participants</span>
                    <div style={styles.inlineActions}>
                      <button
                        style={styles.miniButton}
                        onClick={handleSelectAllExpenseParticipants}
                        disabled={!isAdminMode}
                      >
                        Select All
                      </button>
                      <button
                        style={styles.miniButton}
                        onClick={handleClearAllExpenseParticipants}
                        disabled={!isAdminMode}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="pill-grid" style={styles.personPillGrid}>
                    {people.map((person) => {
                      const selected = expenseParticipantIds.includes(person.id);

                      return (
                        <button
                          key={person.id}
                          type="button"
                          style={{
                            ...styles.personPill,
                            background: selected ? "#dcfce7" : "#f9fafb",
                            borderColor: selected ? "#16a34a" : "#d1d5db",
                          }}
                          onClick={() =>
                            toggleSelection(
                              expenseParticipantIds,
                              setExpenseParticipantIds,
                              person.id
                            )
                          }
                          disabled={!isAdminMode}
                        >
                          {person.name}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    style={{
                      ...styles.primaryButton,
                      opacity: isAdminMode ? 1 : 0.6,
                    }}
                    onClick={handleAddExpense}
                    disabled={!isAdminMode}
                  >
                    Add Expense
                  </button>
                </section>
              </div>

              <div className="main-grid" style={styles.mainGrid}>
                <section style={styles.card}>
                  <h2 style={styles.cardTitle}>Balances</h2>

                  <div style={styles.balanceList}>
                    {personBalances.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setSelectedPersonId(person.id)}
                        style={{
                          ...styles.balanceCard,
                          border:
                            person.id === selectedPerson?.id
                              ? "2px solid #6366f1"
                              : "1px solid #e5e7eb",
                        }}
                      >
                        <div style={styles.balanceTopRow}>
                          <span style={styles.personName}>{person.name}</span>
                          <span
                            style={{
                              ...styles.balanceValue,
                              color: person.balance >= 0 ? "#15803d" : "#b91c1c",
                            }}
                          >
                            {formatCurrency(person.balance)}
                          </span>
                        </div>

                        <div style={styles.balanceMeta}>
                          <span>Deposit: {formatCurrency(person.deposited)}</span>
                          <span>Spent: {formatCurrency(person.spent)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section style={styles.card}>
                  <h2 style={styles.cardTitle}>Selected Person Details</h2>

                  {!selectedPerson ? (
                    <p style={styles.emptyText}>Select a person to view details.</p>
                  ) : (
                    <>
                      <div style={styles.personSummary}>
                        <div>{selectedPerson.name}</div>
                        <div
                          style={{
                            fontWeight: 700,
                            color:
                              selectedPerson.balance >= 0 ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {formatCurrency(selectedPerson.balance)}
                        </div>
                      </div>

                      <div style={styles.detailList}>
                        {selectedPersonRecords.length === 0 ? (
                          <p style={styles.emptyText}>No records yet.</p>
                        ) : (
                          selectedPersonRecords.map((record) => (
                            <div
                              key={`${record.displayType}-${record.id}`}
                              style={styles.detailRow}
                            >
                              <div>
                                <div style={styles.detailType}>
                                  {record.displayType}
                                </div>
                                <div style={styles.detailText}>{record.detail}</div>
                                <div style={styles.detailDate}>
                                  {formatDate(record.createdAt)}
                                </div>
                              </div>
                              <div style={styles.detailAmount}>
                                {formatCurrency(record.amount)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>

              <div className="bottom-grid" style={styles.bottomGrid}>
                <section style={styles.card}>
                  <h2 style={styles.cardTitle}>Spending Distribution</h2>

                  {pieData.length === 0 ? (
                    <p style={styles.emptyText}>No expense data yet.</p>
                  ) : (
                    <div className="chart-box" style={styles.chartBox}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, value }) => {
                              const percent =
                                totalExpenseAmount === 0
                                  ? 0
                                  : (value / totalExpenseAmount) * 100;
                              return `${name} ${formatCurrency(value)} (${percent.toFixed(
                                0
                              )}%)`;
                            }}
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => {
                              const percent =
                                totalExpenseAmount === 0
                                  ? 0
                                  : (value / totalExpenseAmount) * 100;
                              return [
                                `${formatCurrency(value)} (${percent.toFixed(1)}%)`,
                                name,
                              ];
                            }}
                          />
                          <Legend
                            formatter={(value) => {
                              const item = pieData.find((entry) => entry.name === value);
                              if (!item) return value;
                              const percent =
                                totalExpenseAmount === 0
                                  ? 0
                                  : (item.value / totalExpenseAmount) * 100;
                              return `${value} — ${formatCurrency(item.value)} (${percent.toFixed(
                                1
                              )}%)`;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                <section style={styles.card}>
                  <div style={styles.sectionHeaderRow}>
                    <h2 style={styles.cardTitle}>All Records</h2>
                    <button style={styles.secondaryButton} onClick={exportCsv}>
                      Export CSV
                    </button>
                  </div>

                  <div style={styles.recordList}>
                    {allRecords.length === 0 ? (
                      <p style={styles.emptyText}>No records yet.</p>
                    ) : (
                      allRecords.map((record) => (
                        <div key={`${record.type}-${record.id}`} style={styles.recordCard}>
                          <div style={styles.recordTop}>
                            <div>
                              <div style={styles.recordTitle}>
                                {record.type}
                                {record.type === "Expense"
                                  ? ` · ${record.category}`
                                  : ""}
                              </div>
                              <div style={styles.recordDate}>
                                {formatDate(record.createdAt)}
                              </div>
                            </div>

                            <div style={styles.recordTopRight}>
                              <div style={styles.recordAmount}>
                                {formatCurrency(record.totalAmount)}
                              </div>
                              {isAdminMode ? (
                                <button
                                  style={styles.deleteTextButton}
                                  onClick={() =>
                                    record.type === "Deposit"
                                      ? handleDeleteDeposit(record.id)
                                      : handleDeleteExpense(record.id)
                                  }
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div style={styles.recordMeta}>
                            <div>
                              Participants: {record.participants.join(", ")}
                            </div>
                            <div>
                              Per person: {formatCurrency(record.perPersonAmount)}
                            </div>
                            {record.note ? <div>Note: {record.note}</div> : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeGroups(rawGroups) {
  if (!Array.isArray(rawGroups)) return [];
  return rawGroups.map(normalizeGroup).filter(Boolean);
}

function normalizeGroup(group) {
  if (!group || typeof group !== "object") return null;

  const normalizedPeople = Array.isArray(group.people)
    ? group.people.map((person, index) => ({
        id: person?.id || createId(),
        name: person?.name || `Person ${index + 1}`,
      }))
    : [];

  const validPersonIds = new Set(normalizedPeople.map((person) => person.id));

  const normalizedDeposits = Array.isArray(group.deposits)
    ? group.deposits
        .map((deposit) => ({
          id: deposit?.id || createId(),
          type: "deposit",
          personId: validPersonIds.has(deposit?.personId) ? deposit.personId : null,
          amount: Number(deposit?.amount || 0),
          createdAt: deposit?.createdAt || new Date().toISOString(),
        }))
        .filter((deposit) => deposit.personId && deposit.amount >= 0)
    : [];

  const normalizedExpenses = Array.isArray(group.expenses)
    ? group.expenses
        .map((expense) => {
          const participantIds = Array.isArray(expense?.participantIds)
            ? expense.participantIds.filter((id) => validPersonIds.has(id))
            : [];

          return {
            id: expense?.id || createId(),
            type: "expense",
            category: CATEGORY_OPTIONS.includes(expense?.category)
              ? expense.category
              : "其他",
            amount: Number(expense?.amount || 0),
            participantIds,
            note: expense?.note || "",
            createdAt: expense?.createdAt || new Date().toISOString(),
          };
        })
        .filter(
          (expense) =>
            expense.participantIds.length > 0 && Number.isFinite(expense.amount)
        )
    : [];

  return {
    id: group.id || createId(),
    name: group.name || "Untitled Group",
    adminPassword: group.adminPassword || "",
    isAdminMode: Boolean(group.isAdminMode),
    people: normalizedPeople,
    deposits: normalizedDeposits,
    expenses: normalizedExpenses,
    createdAt: group.createdAt || new Date().toISOString(),
  };
}

function formatCurrency(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "16px 10px 32px",
    boxSizing: "border-box",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#111827",
  },
  wrapper: {
    maxWidth: 1320,
    margin: "0 auto",
    display: "grid",
    gap: 14,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: 14,
  },
  modeBadge: {
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr",
    gap: 14,
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "0.95fr 1.05fr",
    gap: 14,
  },
  card: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e5e7eb",
    minWidth: 0,
  },
  cardTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
  },
  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: 13,
  },
  label: {
    display: "block",
    marginTop: 12,
    marginBottom: 6,
    fontWeight: 700,
    fontSize: 14,
  },
  input: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    fontSize: 16,
    boxSizing: "border-box",
    background: "#fff",
  },
  primaryButton: {
    marginTop: 16,
    width: "100%",
    border: "none",
    borderRadius: 14,
    background: "#4f46e5",
    color: "#fff",
    padding: "14px 16px",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryButtonCompact: {
    border: "none",
    borderRadius: 14,
    background: "#4f46e5",
    color: "#fff",
    padding: "13px 16px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d1d5db",
    borderRadius: 14,
    background: "#fff",
    color: "#111827",
    padding: "11px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #fecaca",
    borderRadius: 14,
    background: "#fff1f2",
    color: "#b91c1c",
    padding: "11px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  miniButton: {
    border: "1px solid #d1d5db",
    borderRadius: 999,
    background: "#fff",
    color: "#374151",
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteTextButton: {
    border: "none",
    background: "transparent",
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
  nameList: {
    display: "grid",
    gap: 10,
  },
  savedGroupList: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },
  savedGroupItem: {
    padding: 14,
    borderRadius: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    background: "#fafafa",
  },
  savedGroupName: {
    fontWeight: 800,
    fontSize: 16,
  },
  savedGroupMeta: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  savedGroupActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  emptyText: {
    color: "#6b7280",
    marginTop: 10,
  },
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  adminControls: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  selectionHeader: {
    marginTop: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  inlineActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  personPillGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginTop: 10,
  },
  personPill: {
    padding: "13px 10px",
    borderRadius: 16,
    border: "1px solid #d1d5db",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    minHeight: 48,
  },
  balanceList: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  balanceCard: {
    width: "100%",
    textAlign: "left",
    background: "#fff",
    borderRadius: 16,
    padding: 14,
    cursor: "pointer",
  },
  balanceTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  personName: {
    fontWeight: 800,
    fontSize: 16,
  },
  balanceValue: {
    fontWeight: 800,
    fontSize: 18,
  },
  balanceMeta: {
    marginTop: 8,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    color: "#6b7280",
    fontSize: 13,
  },
  personSummary: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    background: "#f9fafb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    fontWeight: 700,
  },
  detailList: {
    display: "grid",
    gap: 12,
    marginTop: 14,
  },
  detailRow: {
    paddingBottom: 12,
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  detailType: {
    fontWeight: 800,
    marginBottom: 4,
  },
  detailText: {
    color: "#374151",
    fontSize: 14,
  },
  detailDate: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
  detailAmount: {
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  chartBox: {
    width: "100%",
    height: 320,
    marginTop: 8,
  },
  recordList: {
    display: "grid",
    gap: 10,
    marginTop: 14,
    maxHeight: 520,
    overflowY: "auto",
    paddingRight: 4,
  },
  recordCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    background: "#fff",
  },
  recordTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  recordTopRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
  },
  recordTitle: {
    fontWeight: 800,
    fontSize: 15,
  },
  recordDate: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
  recordAmount: {
    fontWeight: 800,
    fontSize: 16,
  },
  recordMeta: {
    marginTop: 10,
    color: "#374151",
    fontSize: 14,
    display: "grid",
    gap: 6,
  },
};

const responsiveStyles = `
  @media (max-width: 1100px) {
    .main-grid,
    .bottom-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 900px) {
    .top-grid,
    .form-grid {
      grid-template-columns: 1fr !important;
    }

    .pill-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 640px) {
    .section-header-row,
    .admin-controls {
      flex-direction: column !important;
      align-items: stretch !important;
    }

    .chart-box {
      height: 260px !important;
    }

    .pill-grid {
      grid-template-columns: 1fr 1fr !important;
    }
  }

  @media (max-width: 480px) {
    .pill-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

export default App;